This repository collects demos that show how you might use [tldraw](https://github.com/tldraw/tldraw) together with an LLM like GPT-4. It is very much a work in progress, please use it as inspiration and experimentation.

PRs welcome for new demos, prompts, strategies and models.

# Installation

Run `npm install` to install dependencies.

# Usage

1. Create an OpenAI API key on the [platform.openai.com](platform.openai.com) website.
2. Create an Assistant on the [platform.openai.com](platform.openai.com) website.
3. Create a second Assistant on the [platform.openai.com](platform.openai.com) website.
4. Create `.env` file at the root of this repo with both the key and the assistant's id.

```
OPENAI_API_KEY="sk-sk-etcetcetc"
OPENAI_ASSISTANT_ID="asst_etcetcetc"
OPENAI_FUNCTIONS_ASSISTANT_ID="asst_etcetcetc"
```

Run `npm run dev` to start the server.

See notes below on the different demos.
