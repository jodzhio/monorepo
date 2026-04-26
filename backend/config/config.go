package config

import (
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	ServerHost  string `yaml:"server_host"`
	ServerPort  int    `yaml:"server_port"`
	LLMAgentURL string `yaml:"llm_agent_url"`
}

// Load читает конфиг из ./config.yaml (если есть) и затем накладывает
// переменные окружения SERVER_HOST, SERVER_PORT, PYTHON_AGENT_URL.
// Дефолты подобраны под OpenAPI-контракт (порт 8000) и локальный Flask-агент.
func Load() *Config {
	cfg := &Config{
		ServerHost:  "0.0.0.0",
		ServerPort:  8000,
		LLMAgentURL: "http://localhost:5000",
	}

	if f, err := os.Open("config.yaml"); err == nil {
		defer f.Close()
		_ = yaml.NewDecoder(f).Decode(cfg)
	}

	if v := os.Getenv("SERVER_HOST"); v != "" {
		cfg.ServerHost = v
	}
	if v := os.Getenv("SERVER_PORT"); v != "" {
		if port, err := strconv.Atoi(v); err == nil {
			cfg.ServerPort = port
		}
	}
	if v := os.Getenv("PYTHON_AGENT_URL"); v != "" {
		cfg.LLMAgentURL = v
	}

	return cfg
}
