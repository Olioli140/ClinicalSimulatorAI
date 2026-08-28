# AI-4.5 — Local LLM Benchmark

## Target hardware

Baseline deployment profile for this benchmark:

- Intel Core i7-8665U
- 24 GB system RAM
- Intel UHD Graphics 620 / no dedicated inference GPU assumed
- Windows laptop

The benchmark therefore treats CPU inference and quantized 4B–8B models as the primary deployment class. Larger models may be tested separately but are not required for the default ClinicalSimulatorAI installation.

## License policy

Preferred default-model policy: permissive open-weight license suitable for redistribution and integration. Apache-2.0 is preferred where model quality is sufficient.

The initial benchmark candidates are Qwen3 4B and Qwen3 8B. Qwen states that its Qwen3 open-weight models are Apache-2.0 licensed and documents local execution through Ollama and llama.cpp.

Model licenses must be re-checked at release time. A model family name alone is not sufficient evidence for the license of a particular checkpoint or derivative.

## What is measured

ClinicalSimulatorAI does not choose a model based on generic chatbot benchmarks alone. The local benchmark measures simulator-specific behavior:

- grounded use of supplied observations;
- absence of invented measurements and hidden diagnoses;
- correct identification of visible priorities;
- ability to recommend no action for a stable state;
- strict structured/JSON output where required;
- latency on the target laptop;
- output size and runtime failures.

## Initial candidate tiers

### Standard candidate — Qwen3 4B
Expected to be the best first candidate for the target CPU-only laptop. It should be evaluated with a 4-bit quantization for interactive use.

### Quality reference — Qwen3 8B
Used to determine whether the extra inference time and memory provide a clinically meaningful improvement over 4B.

## Selection gate

No model becomes the ClinicalSimulatorAI default merely because it runs. A candidate must pass simulator-specific grounding and structured-output tests. Medical plausibility must then be reviewed separately with a larger expert-labelled anesthesia scenario set.

## Important limitation

AI-4.5 is an engineering/model-selection benchmark. It is not medical-device validation and does not establish clinical safety or clinical efficacy.
