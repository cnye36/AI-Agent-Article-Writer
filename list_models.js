
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error("No API Key found");
  process.exit(1);
}

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.models) {
    console.log("Available Models:");
    data.models.forEach(m => {
      if (m.name.includes("image") || m.name.includes("gemini") || m.name.includes("imagen")) {
        console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
      }
    });
  } else {
    console.log("No models found or error:", data);
  }
}

listModels();
