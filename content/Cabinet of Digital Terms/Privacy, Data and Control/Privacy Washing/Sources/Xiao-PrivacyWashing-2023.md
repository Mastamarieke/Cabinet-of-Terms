---
title: "Xiao et al. (2023)"
full_title: "Lalaine: Measuring and Characterizing Non-Compliance of Apple Privacy Labels"
type: source
source_role: primary
source_type: academic-article
analytical_layer: [mechanism]
source_function: [Empirical/Data]
author: Yue Xiao, Zhengyi Li, Yue Qin, Xiaolong Bai, Jiale Guan, Xiaojing Liao, Luyi Xing
year: 2023
journal: 32nd USENIX Security Symposium
url: https://www.usenix.org/conference/usenixsecurity23/presentation/xiao-yue
access: open-access
discipline: [Computer Security]
cluster: Privacy, Data and Control
linked_entries: ["[[Privacy Washing]]"]
tags: [source, primary, open-access]
---

## Xiao et al. (2023) — Lalaine: Measuring and Characterizing Non-Compliance of Apple Privacy Labels

**Xiao, Y., Li, Z., Qin, Y., Bai, X., Guan, J., Liao, X. & Xing, L. (2023). Lalaine: Measuring and Characterizing Non-Compliance of Apple Privacy Labels.** *32nd USENIX Security Symposium*. https://www.usenix.org/conference/usenixsecurity23/presentation/xiao-yue

---

### What this source contributes

Apple introduced privacy labels in the App Store in December 2020, to help users understand an app's data practices before they download it. The researchers compared the labels of 5,102 iOS apps with what the apps actually send, analysing their code and network traffic. 3,423 apps had labels that did not match: 3,281 failed to disclose data and purposes, 1,628 gave purposes that contradicted their behaviour, and 677 disclosed purposes inadequately. In one case an app for beauty treatments, labelled *Data Not Collected*, sent the user's precise location. Among the causes they name opaque data collection by third-party partners and misleading guidance for filling in the labels. "False and misleading privacy labels can dupe privacy-conscious consumers into downloading data-intensive apps."

### Analytical function in Privacy Washing

The measurement. Where Cirucci reads the promise, Xiao et al. test it: a privacy label is a sign of safety that is easy to show and hard to check, and for two in three apps it did not hold. It turns the entry's handle in Why This Matters, a promise is a claim you can test, into a finding.

### Related entries

- [[Privacy Washing]] — the label as a promise that can be measured
