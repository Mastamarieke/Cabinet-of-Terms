---
term: Red Teamer
cluster: New Digital Professions
analytical_layer: mechanism
status: publieksversie
version: V2
analysis_version: pending
related_cause:
  - AI Dependency
  - Dark Patterns
related_mechanism:
  - Prompt Engineer
related_consequence:
  - AI Dependency
related_reaction:
  - AI Literacy
  - VSD (Value Sensitive Design)
---

***Their job is to break the system before someone else does. Their independence is their value. Their structural position compromises it.***

**Literal meaning:** A **red teamer** is a security or safety professional whose role is to attack, stress-test, or adversarially probe a system — finding vulnerabilities, edge cases, and failure modes before they are discovered by malicious actors. In AI safety contexts, red teamers attempt to elicit harmful, biased, or otherwise problematic outputs from AI systems, to identify and address them before deployment.

**Origin:** The term comes from Cold War military practice: a "red team" (adversary) tests the defences of a "blue team" (defender). In cybersecurity, red teaming became standard practice from the 1990s. In AI safety, the role scaled rapidly from 2022–2023, as AI companies including Anthropic, **OpenAI**, and Google **DeepMind** established red team programmes and recruited specialist red teamers to probe their models before public release. Independent red team research also emerged from academic AI safety communities.

> A professional who tests systems adversarially to find failure modes before harmful deployment — whose value depends on being given genuine access.

**The Appeal:** Red teaming provides genuine safety value. Adversarial testing before deployment identifies harms that developers who are close to the system may not anticipate. The **red teamer**'s outsider perspective — approaching the system as a potential attacker — surfaces failure modes that standard testing misses. The profession has been instrumental in identifying and documenting AI system vulnerabilities including jailbreaks, biases, and safety failures.

**The Friction:** The structural tension is the analytical core. Red teamers employed by the companies whose systems they are testing face structural pressure that compromises their independence: findings that delay launches or require expensive remediation create organisational friction. Independent red teamers and academic researchers lack the access to pre-deployment systems that would make their work most valuable. The [[Black Box]] problem applies directly: red teamers often probe systems without access to training data, model weights, or architecture — testing the surface of systems whose interiors are unavailable. [[VSD (Value Sensitive Design)]] is what red teaming is implicitly doing: systematically investigating what values a system fails to support and what harms it produces.

**Why This Matters:** **Red teamer** makes visible the tension between safety and deployment speed that AI development routinely navigates. The profession's structural compromise — hired by the company to find the company's failures — is not incidental. It is a design choice with consequences.

**See also:** [[Prompt Engineer]] · [[AI Dependency]] · [[Black Box]] · [[VSD (Value Sensitive Design)]]


---

*Generated with AI (Claude, Anthropic) using cartographic prompting — a research method developed within Project Digitale Alertheid, HAN CMD, 2026.*

**Read more:**
- [Red Teaming Language Models to Reduce Harms: # Methods, Scaling Behaviors, and Lessons Learned](https://arxiv.org/abs/2209.07858) — Ganguli, D. et al. (2022). *arXiv / Anthropic*
- [Sociotechnical Safety Evaluation of Generative AI Systems](https://doi.org/10.48550/arXiv.2310.11986) — Weidinger, L. et al. (2023). *arXiv / DeepMind*

---

## Navigation

**Layer:** Mechanism — adversarial system testing whose value depends on independence that employment compromises

**Cause:** [[AI Dependency]] · [[Dark Patterns]]
**Mechanism:** [[Prompt Engineer]]
**Consequence:** [[AI Dependency]]
**Reaction:** [[AI Literacy]] · [[VSD (Value Sensitive Design)]]
