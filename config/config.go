package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	ServerHost  string `yaml:"server_host"`
	ServerPort  int    `yaml:"server_port"`
	LLMAgentURL string `yaml:"llm_agent_url"`
}

func Load() *Config {
	cfg := &Config{
		ServerHost:  "localhost",
		ServerPort:  8080,
		LLMAgentURL: "http://localhost:5000",
	}

	f, err := os.Open("config.yaml")
	if err != nil {
		return cfg
	}
	defer f.Close()

	decoder := yaml.NewDecoder(f)
	if err := decoder.Decode(cfg); err != nil {
		return cfg
	}

	return cfg
}
