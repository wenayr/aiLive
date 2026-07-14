# Repeated exchange-adapter case

The seed contains one canonical operation, `normalizeQuote`, and one Binance
adapter. The controlled model performs three bounded coding actions:

1. add a Bybit adapter correctly;
2. add an OKX adapter as a repeated task;
3. if the focused genetic inspection finds contract drift, repair OKX once.

The useful question is not whether fixture code can be generated. It is whether
the first accepted task can create a small instruction that is selected for the
second task, constrains a focused review, and changes the repair request without
giving the model unrestricted tools.
