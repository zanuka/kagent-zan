package api

type PineconeMemoryConfig struct {
	ApiKey    string `json:"api_key"`
	IndexHost string `json:"index_host"`
	TopK      int    `json:"top_k"`
	Namespace string `json:"namespace"`
}

func (c *PineconeMemoryConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *PineconeMemoryConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}
