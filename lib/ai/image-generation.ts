export async function generateImage(prompt: string, aspectRatio: "1:1" | "16:9" | "4:3" = "16:9") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Missing OPENAI_API_KEY" };
  }

  // Map aspect ratios to OpenAI size formats
  // GPT image models support: 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait)
  const sizeMap: Record<"1:1" | "16:9" | "4:3", string> = {
    "1:1": "1024x1024",
    "16:9": "1536x1024", // landscape
    "4:3": "1024x1536", // portrait (closest to 4:3)
  };

  const size = sizeMap[aspectRatio];
  
  try {
    const requestBody = {
      model: "gpt-image-1-mini",
      prompt: prompt,
      n: 1,
      size: size,
      output_format: "png" as const, // GPT image models return base64 by default
      quality: "high",
    };

    console.log("OpenAI image generation request:", { model: requestBody.model, size: requestBody.size, promptLength: prompt.length });

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("OpenAI image generation failed:", {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });
      return { success: false, error: `OpenAI image generation failed: ${response.status} - ${responseText}` };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseText, parseError);
      return { success: false, error: "Invalid JSON response from OpenAI" };
    }
    
    // OpenAI response structure for GPT image models
    // Returns b64_json in the data array
    const imageData = data.data?.[0];
    if (imageData?.b64_json) {
      return { success: true, image: imageData.b64_json };
    }
    
    console.error("Unexpected OpenAI response structure:", JSON.stringify(data, null, 2));
    return { success: false, error: "No image data found in response. " + JSON.stringify(data) };

  } catch (error) {
    console.error("Image generation failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}


export async function generateImagePrompt(articleContent: string, articleTitle: string) {
    // We can use a small LLM call to generate a good prompt
    // This helper can be used by the agent
    // Implementation will be inside the agent for now, but good to keep in mind.
}
