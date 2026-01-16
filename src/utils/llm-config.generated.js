// AUTO-GENERATED from llm_config.yml - DO NOT EDIT
// Run "npm run build:config" to regenerate
(function() {
    var LLM_CONFIG = {
  "providers": {
    "deepseek-volcengine": {
      "name": "DeepSeek (Volcengine)",
      "apiKeyEnvVar": "DEEPSEEK_API_KEY_VOLC",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      "temperature": 0.9,
      "maxTokens": 16000,
      "contextWindow": 128000,
      "pricingCurrency": "¥",
      "rateLimit": null,
      "requestOverrides": null,
      "models": [
        {
          "key": "deepseek-v3.2",
          "id": "deepseek-v3-2-251201",
          "name": "DeepSeek V3.2",
          "pricing": {
            "input": 4,
            "output": 6
          }
        },
        {
          "key": "deepseek-r1",
          "id": "deepseek-r1-250528",
          "name": "DeepSeek R1",
          "pricing": {
            "input": 4,
            "output": 12
          }
        }
      ]
    },
    "gemini": {
      "name": "Google Gemini",
      "apiKeyEnvVar": "GEMINI_API_KEY",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      "temperature": 0.9,
      "maxTokens": 65536,
      "contextWindow": 1000000,
      "pricingCurrency": "$",
      "rateLimit": null,
      "requestOverrides": null,
      "models": [
        {
          "key": "gemini-2.5-flash",
          "id": "gemini-2.5-flash",
          "name": "Gemini 2.5 Flash",
          "pricing": {
            "input": 0.15,
            "output": 0.6
          }
        },
        {
          "key": "gemini-2.5-pro",
          "id": "gemini-2.5-pro",
          "name": "Gemini 2.5 Pro",
          "pricing": {
            "input": 1.25,
            "output": 5
          }
        }
      ]
    },
    "gemini-free": {
      "name": "Google Gemini (Free Tier)",
      "apiKeyEnvVar": "GEMINI_FT_API_KEY",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      "temperature": 0.9,
      "maxTokens": 65536,
      "contextWindow": 1000000,
      "pricingCurrency": "$",
      "rateLimit": {
        "minIntervalSeconds": 12,
        "maxRequestsPerMinute": 5
      },
      "requestOverrides": null,
      "models": [
        {
          "key": "gemini-2.5-flash-free",
          "id": "gemini-2.5-flash",
          "name": "Gemini 2.5 Flash (Free)",
          "pricing": {
            "input": 0,
            "output": 0
          }
        }
      ]
    },
    "qwen": {
      "name": "Alibaba Qwen",
      "apiKeyEnvVar": "QWEN_API_KEY",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      "temperature": 0.9,
      "maxTokens": 32768,
      "contextWindow": 995904,
      "pricingCurrency": "¥",
      "rateLimit": null,
      "requestOverrides": null,
      "models": [
        {
          "key": "qwen-plus",
          "id": "qwen-plus",
          "name": "Qwen Plus",
          "pricing": {
            "input": 0.8,
            "output": 2
          }
        },
        {
          "key": "qwen3-max",
          "id": "qwen3-max",
          "name": "Qwen3 Max",
          "pricing": {
            "input": 0.6,
            "output": 24
          }
        }
      ]
    },
    "zhipu": {
      "name": "Zhipu AI (GLM)",
      "apiKeyEnvVar": "ZHIPU_API_KEY",
      "baseUrl": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      "temperature": 0.9,
      "maxTokens": 128000,
      "contextWindow": 200000,
      "pricingCurrency": "$",
      "rateLimit": null,
      "requestOverrides": null,
      "models": [
        {
          "key": "glm-4.5",
          "id": "glm-4.5",
          "name": "GLM-4.5",
          "pricing": {
            "input": 0.6,
            "output": 2.2
          }
        },
        {
          "key": "glm-4.6",
          "id": "glm-4.6",
          "name": "GLM-4.6",
          "pricing": {
            "input": 0.6,
            "output": 2.2
          }
        }
      ]
    },
    "doubao": {
      "name": "Doubao (Volcengine)",
      "apiKeyEnvVar": "DOUBAO_API_KEY",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      "temperature": 0.9,
      "maxTokens": 32000,
      "contextWindow": 256000,
      "pricingCurrency": "¥",
      "rateLimit": null,
      "requestOverrides": null,
      "models": [
        {
          "key": "doubao-seed-1.6",
          "id": "doubao-seed-1-6-250615",
          "name": "Doubao Seed 1.6",
          "pricing": {
            "input": 0.8,
            "output": 2
          }
        },
        {
          "key": "doubao-pro-32k",
          "id": "doubao-pro-32k",
          "name": "Doubao Pro 32K",
          "pricing": {
            "input": 0.8,
            "output": 2
          }
        }
      ]
    },
    "openai-openrouter": {
      "name": "OpenAI (via OpenRouter)",
      "apiKeyEnvVar": "OPENAI_API_KEY_OPENROUTER",
      "baseUrl": "https://openrouter.ai/api/v1/chat/completions",
      "temperature": 0.9,
      "maxTokens": 16384,
      "contextWindow": 128000,
      "pricingCurrency": "$",
      "rateLimit": null,
      "requestOverrides": null,
      "models": [
        {
          "key": "gpt-4o-or",
          "id": "openai/gpt-4o",
          "name": "GPT-4o",
          "pricing": {
            "input": 2.5,
            "output": 10
          }
        },
        {
          "key": "gpt-4o-mini-or",
          "id": "openai/gpt-4o-mini",
          "name": "GPT-4o Mini",
          "pricing": {
            "input": 0.15,
            "output": 0.6
          }
        }
      ]
    },
    "anthropic-openrouter": {
      "name": "Anthropic (via OpenRouter)",
      "apiKeyEnvVar": "ANTHROPIC_API_KEY_OPENROUTER",
      "baseUrl": "https://openrouter.ai/api/v1/chat/completions",
      "temperature": 0.9,
      "maxTokens": 64000,
      "contextWindow": 200000,
      "pricingCurrency": "$",
      "rateLimit": {
        "minIntervalSeconds": 1,
        "maxRequestsPerMinute": 30
      },
      "requestOverrides": null,
      "models": [
        {
          "key": "claude-sonnet-4-or",
          "id": "anthropic/claude-sonnet-4",
          "name": "Claude Sonnet 4",
          "pricing": {
            "input": 3,
            "output": 15
          }
        },
        {
          "key": "claude-3.5-sonnet-or",
          "id": "anthropic/claude-3.5-sonnet",
          "name": "Claude 3.5 Sonnet",
          "pricing": {
            "input": 3,
            "output": 15
          }
        }
      ]
    },
    "custom": {
      "name": "Custom Endpoint",
      "apiKeyEnvVar": "",
      "baseUrl": "",
      "temperature": 0.9,
      "maxTokens": 4096,
      "contextWindow": 128000,
      "pricingCurrency": "$",
      "rateLimit": null,
      "requestOverrides": null,
      "models": []
    }
  }
};

    // Browser / Extension runtime
    if (typeof globalThis !== 'undefined') {
        globalThis.LLM_CONFIG = LLM_CONFIG;
    }

    // Node.js / Jest support
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LLM_CONFIG;
    }
})();
