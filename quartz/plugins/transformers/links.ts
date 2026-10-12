import { QuartzTransformerPlugin } from "../types"
import {
  FullSlug,
  RelativeURL,
  SimpleSlug,
  TransformOptions,
  stripSlashes,
  simplifySlug,
  splitAnchor,
  transformLink,
} from "../../util/path"
import path from "path"
import { visit } from "unist-util-visit"
import isAbsoluteUrl from "is-absolute-url"
import { Root } from "hast"

interface Options {
  /** How to resolve Markdown paths */
  markdownLinkResolution: TransformOptions["strategy"]
  /** Strips folders from a link so that it looks nice */
  prettyLinks: boolean
  openLinksInNewTab: boolean
  lazyLoad: boolean
  externalLinkIcon: boolean
}

const defaultOptions: Options = {
  markdownLinkResolution: "absolute",
  prettyLinks: true,
  openLinksInNewTab: false,
  lazyLoad: false,
  externalLinkIcon: true,
}

export const CrawlLinks: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "LinkProcessing",
    htmlPlugins(ctx) {
      return [
        () => {
          return (tree: Root, file) => {
            const curSlug = simplifySlug(file.data.slug!)
            const outgoing: Set<SimpleSlug> = new Set()
            // Which links an entry argues and which it only lists (2026-10-10). A link inside
            // the "Related terms:" paragraph is a side path; every other link is argued: in the
            // running text, or in "In the text:", which lists the text's links and those the
            // landscape tells (11-10). The graph uses this to draw a relation thick, plain or dashed.
            const textOut: Set<SimpleSlug> = new Set()
            const relatedOut: Set<SimpleSlug> = new Set()
            const relatedAnchors = new WeakSet<object>()
            const inTextAnchors = new WeakSet<object>()
            const textOf = (n: any): string =>
              n.type === "text" ? n.value : (n.children ?? []).map(textOf).join("")
            visit(tree, "element", (p) => {
              if (p.tagName !== "p") return
              const first = p.children.find(
                (c: any) => c.type === "element" || (c.type === "text" && c.value.trim() !== ""),
              ) as any
              if (!first || first.type !== "element" || first.tagName !== "strong") return
              const label = textOf(first).trim()
              // the parts of an entry get an anchor, #the-friction, #why-this-matters, so the
              // landscape (and anyone) can point to them (11-10)
              const part = label.replace(/:$/, "")
              if (["Literal meaning", "Origin", "The Appeal", "The Friction", "Why This Matters"].includes(part)) {
                p.properties = { ...(p.properties ?? {}), id: part.toLowerCase().replace(/\s+/g, "-") }
              }
              const into = label.startsWith("Related terms")
                ? relatedAnchors
                : label.startsWith("In the text")
                  ? inTextAnchors
                  : null
              if (!into) return
              visit(p, "element", (a) => {
                if (a.tagName === "a") into.add(a)
              })
              // In the text repeats the links of the running text: kept in the file for the checks,
              // hidden on the site (11-10)
              if (into === inTextAnchors) {
                p.properties = { ...(p.properties ?? {}), className: ["in-text-line"] }
              }
              // The reason after a related term, "(…)", in its own span so it can be set
              // smaller than the term names (10-10).
              if (into === relatedAnchors) {
                const kids: any[] = []
                for (const c of p.children as any[]) {
                  if (c.type !== "text" || !c.value.includes("(")) {
                    kids.push(c)
                    continue
                  }
                  let rest: string = c.value
                  let m: RegExpExecArray | null
                  const re = /\(([^()]*)\)/
                  while ((m = re.exec(rest))) {
                    if (m.index > 0) kids.push({ type: "text", value: rest.slice(0, m.index) })
                    kids.push({
                      type: "element",
                      tagName: "span",
                      properties: { className: ["rt-reason"] },
                      children: [{ type: "text", value: m[0] }],
                    })
                    rest = rest.slice(m.index + m[0].length)
                  }
                  if (rest) kids.push({ type: "text", value: rest })
                }
                p.children = kids
                // marked, so the reasons can fold away and open one at a time (10-10, relatedTerms.inline.ts)
                if (kids.some((k: any) => k.type === "element" && k.properties?.className?.includes?.("rt-reason"))) {
                  p.properties = { ...(p.properties ?? {}), className: ["rt-line"] }
                }
              }
            })

            const transformOptions: TransformOptions = {
              strategy: opts.markdownLinkResolution,
              allSlugs: ctx.allSlugs,
            }

            visit(tree, "element", (node, _index, _parent) => {
              // rewrite all links
              if (
                node.tagName === "a" &&
                node.properties &&
                typeof node.properties.href === "string"
              ) {
                let dest = node.properties.href as RelativeURL
                const classes = (node.properties.className ?? []) as string[]
                const isExternal = isAbsoluteUrl(dest, { httpOnly: false })
                classes.push(isExternal ? "external" : "internal")

                if (isExternal && opts.externalLinkIcon) {
                  node.children.push({
                    type: "element",
                    tagName: "svg",
                    properties: {
                      "aria-hidden": "true",
                      class: "external-icon",
                      style: "max-width:0.8em;max-height:0.8em",
                      viewBox: "0 0 512 512",
                    },
                    children: [
                      {
                        type: "element",
                        tagName: "path",
                        properties: {
                          d: "M320 0H288V64h32 82.7L201.4 265.4 178.7 288 224 333.3l22.6-22.6L448 109.3V192v32h64V192 32 0H480 320zM32 32H0V64 480v32H32 456h32V480 352 320H424v32 96H64V96h96 32V32H160 32z",
                        },
                        children: [],
                      },
                    ],
                  })
                }

                // Check if the link has alias text
                if (
                  node.children.length === 1 &&
                  node.children[0].type === "text" &&
                  node.children[0].value !== dest
                ) {
                  // Add the 'alias' class if the text content is not the same as the href
                  classes.push("alias")
                }
                node.properties.className = classes

                if (isExternal && opts.openLinksInNewTab) {
                  node.properties.target = "_blank"
                }

                // don't process external links or intra-document anchors
                const isInternal = !(
                  isAbsoluteUrl(dest, { httpOnly: false }) || dest.startsWith("#")
                )
                if (isInternal) {
                  dest = node.properties.href = transformLink(
                    file.data.slug!,
                    dest,
                    transformOptions,
                  )

                  // url.resolve is considered legacy
                  // WHATWG equivalent https://nodejs.dev/en/api/v18/url/#urlresolvefrom-to
                  const url = new URL(dest, "https://base.com/" + stripSlashes(curSlug, true))
                  const canonicalDest = url.pathname
                  let [destCanonical, _destAnchor] = splitAnchor(canonicalDest)
                  if (destCanonical.endsWith("/")) {
                    destCanonical += "index"
                  }

                  // need to decodeURIComponent here as WHATWG URL percent-encodes everything
                  const full = decodeURIComponent(stripSlashes(destCanonical, true)) as FullSlug
                  const simple = simplifySlug(full)
                  outgoing.add(simple)
                  // In the text is the overview of what the entry argues: the running text and,
                  // since 11-10, the terms its semantic landscape tells (Marieke: a term in the
                  // landscape is an argued relation, not a side path). It counts as argued.
                  if (relatedAnchors.has(node)) relatedOut.add(simple)
                  else textOut.add(simple)
                  node.properties["data-slug"] = full
                }

                // rewrite link internals if prettylinks is on
                if (
                  opts.prettyLinks &&
                  isInternal &&
                  node.children.length === 1 &&
                  node.children[0].type === "text" &&
                  !node.children[0].value.startsWith("#")
                ) {
                  node.children[0].value = path.basename(node.children[0].value)
                }
              }

              // transform all other resources that may use links
              if (
                ["img", "video", "audio", "iframe"].includes(node.tagName) &&
                node.properties &&
                typeof node.properties.src === "string"
              ) {
                if (opts.lazyLoad) {
                  node.properties.loading = "lazy"
                }

                if (!isAbsoluteUrl(node.properties.src, { httpOnly: false })) {
                  let dest = node.properties.src as RelativeURL
                  dest = node.properties.src = transformLink(
                    file.data.slug!,
                    dest,
                    transformOptions,
                  )
                  node.properties.src = dest
                }
              }
            })

            file.data.links = [...outgoing]
            file.data.relatedLinks = [...relatedOut].filter((l) => !textOut.has(l))
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    links: SimpleSlug[]
    relatedLinks: SimpleSlug[]
  }
}
