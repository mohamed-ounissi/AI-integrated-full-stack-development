// before the Vercel AI SDK.
// Run: node --env-file=.env scripts/gemini-raw-check.js

const MODEL = 'gemini-3.6-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env and run with: node --env-file=.env scripts/gemini-raw-check.js');
  }
  return key;
}

function buildRequestBody(prompt) {
  return {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };
}

async function callGemini(prompt) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKey(),
    },
    body: JSON.stringify(buildRequestBody(prompt)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}


// response example before extractText call:
// {
//   "candidates": [
//     {
//       "content": {
//         "parts": [
//           {
//             "text": "Yes, I received your message."
//           }
//         ]
//       }
//     }
//   ]
// }

function extractText(geminiResponse) {
  const text = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Could not find text in response: ${JSON.stringify(geminiResponse, null, 2)}`);
  }
  return text;
}

async function main() {
  const prompt = 'In one short sentence, confirm you received this message.';
  console.log(`Calling ${MODEL} with prompt: "${prompt}"`);

  const raw = await callGemini(prompt);
  const text = extractText(raw);

  console.log('\nGemini replied:');
  console.log(text);
}

main().catch((err) => {
  console.error('\nM0 check failed:', err.message);
  process.exit(1);
});
