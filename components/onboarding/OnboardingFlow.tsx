"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ONBOARDING_QUESTIONS,
  INDUSTRIES,
  INDUSTRY_TOPICS,
  INDUSTRY_MAPPING,
  determineIndustryFromAnswers,
  getSubcategoriesForIndustry,
  type OnboardingQuestion,
} from "@/lib/onboarding-config";
import { Check, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: (answers: Record<string, string | string[]>, industry: string, subcategories: string[]) => void;
  onSkip?: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customKeywords, setCustomKeywords] = useState<string>("");

  const totalSteps = ONBOARDING_QUESTIONS.length + 1; // Questions + review (no separate subcategory step)
  const isReviewStep = currentStep === ONBOARDING_QUESTIONS.length;
  const isQuestionStep = !isReviewStep;

  // Determine industry from Q1 answer
  const determinedIndustry = useMemo(() => {
    const q1Answer = answers["primary-industry"];
    if (typeof q1Answer === "string" && INDUSTRY_MAPPING[q1Answer]) {
      return INDUSTRY_MAPPING[q1Answer];
    }
    return "technology"; // Default fallback
  }, [answers]);

  const industryConfig = INDUSTRIES[determinedIndustry];

  // Dynamically populate Q2 options based on Q1 answer
  const currentQuestion = useMemo(() => {
    if (currentStep >= ONBOARDING_QUESTIONS.length) return null;

    const question = ONBOARDING_QUESTIONS[currentStep];

    // If it's Q2 (specific-topics), populate options from the determined industry
    if (question.id === "specific-topics" && determinedIndustry) {
      const topicOptions = INDUSTRY_TOPICS[determinedIndustry] || [];
      return {
        ...question,
        options: topicOptions.map(topic => ({
          label: topic.label,
          value: topic.value,
          description: "", // Topics don't need descriptions in this context
          industryWeights: {}, // Empty weights since industry is already determined
        })),
      };
    }

    return question;
  }, [currentStep, determinedIndustry]);

  // Extract selected subcategories from Q2 answer
  const selectedSubcategories = useMemo(() => {
    const q2Answer = answers["specific-topics"];
    if (Array.isArray(q2Answer)) {
      return q2Answer;
    }
    return [];
  }, [answers]);

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Complete onboarding
      const keywordsArray = customKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      // Add custom keywords to answers if they exist
      const finalAnswers = {
        ...answers,
        ...(keywordsArray.length > 0 ? { "custom-keywords": customKeywords } : {}),
      };

      onComplete(finalAnswers, determinedIndustry, selectedSubcategories);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const canProceed = () => {
    if (isQuestionStep && currentQuestion) {
      const answer = answers[currentQuestion.id];

      // For multiple choice questions, check if at least one option is selected
      if (currentQuestion.type === "multiple-choice") {
        return Array.isArray(answer) && answer.length > 0;
      }

      // For single choice questions, check if an option is selected
      return answer !== undefined && answer !== null && answer !== "";
    }
    return true; // Review step can always proceed
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl bg-zinc-900/80 backdrop-blur-sm border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="p-8 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-blue-500">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">Personalize Your Experience</span>
            </div>
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep ? "bg-blue-500" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-zinc-500 mt-2">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">
          {/* Question Steps */}
          {isQuestionStep && currentQuestion && (
            <QuestionStep
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              onAnswerChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              customKeywords={customKeywords}
              onCustomKeywordsChange={setCustomKeywords}
              showCustomKeywords={currentQuestion.id === "specific-topics"}
            />
          )}

          {/* Review Step */}
          {isReviewStep && (
            <ReviewStep
              industry={industryConfig}
              selectedSubcategories={selectedSubcategories}
              customKeywords={customKeywords}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-zinc-800 flex items-center justify-between">
          <Button
            onClick={handleBack}
            disabled={currentStep === 0}
            variant="ghost"
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isReviewStep ? "Complete Setup" : "Continue"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Question Step Component
function QuestionStep({
  question,
  answer,
  onAnswerChange,
  customKeywords,
  onCustomKeywordsChange,
  showCustomKeywords,
}: {
  question: OnboardingQuestion;
  answer: string | string[] | undefined;
  onAnswerChange: (value: string | string[]) => void;
  customKeywords: string;
  onCustomKeywordsChange: (value: string) => void;
  showCustomKeywords: boolean;
}) {
  const isMultipleChoice = question.type === "multiple-choice";
  const selectedValues = Array.isArray(answer) ? answer : answer ? [answer] : [];
  const maxSelections = 6; // Limit for multiple choice questions

  const handleOptionClick = (value: string) => {
    if (isMultipleChoice) {
      if (selectedValues.includes(value)) {
        // Deselect
        const newValues = selectedValues.filter((v) => v !== value);
        onAnswerChange(newValues);
      } else {
        // Select (if not at limit)
        if (selectedValues.length < maxSelections) {
          onAnswerChange([...selectedValues, value]);
        }
      }
    } else {
      onAnswerChange(value);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">{question.question}</h2>
        {isMultipleChoice && (
          <p className="text-sm text-zinc-500">
            Select up to {maxSelections} options ({selectedValues.length}/{maxSelections} selected)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
        {question.options?.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          const isDisabled = isMultipleChoice && !isSelected && selectedValues.length >= maxSelections;

          return (
            <button
              key={option.value}
              onClick={() => !isDisabled && handleOptionClick(option.value)}
              disabled={isDisabled}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                isSelected
                  ? "border-blue-500 bg-blue-500/10"
                  : isDisabled
                  ? "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-100 text-sm mb-1">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-zinc-400 line-clamp-2">{option.description}</div>
                  )}
                </div>
                {isSelected && (
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Keywords Input (shown on Q2) */}
      {showCustomKeywords && (
        <div className="pt-4 border-t border-zinc-800">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Additional Keywords (Optional)
          </label>
          <input
            type="text"
            value={customKeywords}
            onChange={(e) => onCustomKeywordsChange(e.target.value)}
            placeholder="e.g., Next.js, TypeScript, React..."
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-zinc-500 mt-1">Separate multiple keywords with commas</p>
        </div>
      )}
    </div>
  );
}

// Review Step
function ReviewStep({
  industry,
  selectedSubcategories,
  customKeywords,
}: {
  industry: any;
  selectedSubcategories: string[];
  customKeywords: string;
}) {
  // Get the topic labels from INDUSTRY_TOPICS based on selected values
  const industryKey = Object.keys(INDUSTRIES).find(
    (key) => INDUSTRIES[key].name === industry.name
  );
  const topicOptions = industryKey ? INDUSTRY_TOPICS[industryKey] || [] : [];

  const selectedTopicNames = topicOptions
    .filter((topic) => selectedSubcategories.includes(topic.value))
    .map((topic) => topic.label);

  const keywordsArray = customKeywords
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
          You're All Set!
        </h2>
        <p className="text-zinc-400">
          Here's how we've personalized your experience based on your answers:
        </p>
      </div>

      <div className="space-y-4">
        {/* Primary Industry */}
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="text-sm text-zinc-500 mb-1">Primary Industry</div>
          <div className="text-lg font-semibold text-blue-400">{industry.name}</div>
          <div className="text-sm text-zinc-400 mt-1">{industry.description}</div>
        </div>

        {/* Selected Topics */}
        {selectedTopicNames.length > 0 && (
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="text-sm text-zinc-500 mb-2">Your Focus Areas</div>
            <div className="flex flex-wrap gap-2">
              {selectedTopicNames.map((name) => (
                <span
                  key={name}
                  className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-300"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Custom Keywords */}
        {keywordsArray.length > 0 && (
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="text-sm text-zinc-500 mb-2">Custom Keywords</div>
            <div className="flex flex-wrap gap-2">
              {keywordsArray.map((keyword) => (
                <span
                  key={keyword}
                  className="px-3 py-1 bg-zinc-700 rounded-full text-sm text-zinc-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          ✨ Your dashboard, keyword suggestions, and prompts will now be tailored to {industry.name}.
          You can always change these settings later.
        </p>
      </div>
    </div>
  );
}
