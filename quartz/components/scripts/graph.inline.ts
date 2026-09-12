import type { ContentDetails } from "../../plugins/emitters/contentIndex"
import {
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceRadial,
  forceX,
  forceY,
  select,
  drag,
  zoom,
} from "d3"
import { Text, Graphics, Application, Container, Circle } from "pixi.js"
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js"
import { registerEscapeHandler, removeAllChildren } from "./util"
import { FullSlug, SimpleSlug, getFullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { D3Config } from "../Graph"

type GraphicsInfo = {
  color: string
  gfx: Graphics
  alpha: number
  active: boolean
}

type NodeData = {
  id: SimpleSlug
  text: string
  tags: string[]
} & SimulationNodeDatum

type SimpleLinkData = {
  source: SimpleSlug
  target: SimpleSlug
}

type LinkData = {
  source: NodeData
  target: NodeData
} & SimulationLinkDatum<NodeData>

type LinkRenderData = GraphicsInfo & {
  simulationData: LinkData
  label?: Text
  // where along the line the relation word sits, 0.5 being the middle
  labelT?: number
  // colour of the line when nothing is hovered: the cluster it leads to
  restColor?: string
  // which kind of relation this line carries, for the legend
  relation?: string
}

type NodeRenderData = GraphicsInfo & {
  simulationData: NodeData
  label: Text
  // which of the candidate spots this label last settled on — tried first next time, so a
  // label that already has a good place is not shuffled to an equally good one every pass
  placement?: number
  // angle on the ring in the radial layout, where the label hangs straight outwards
  angle?: number
  // which ring: terms sit on the outer one, sources on an inner one of their own
  ring?: number
  // sources read inwards, so their names stay in the band between the two rings
  inward?: boolean
}

// Bump when the graph changes visibly; shown at the foot of the legend.
const GRAPH_BUILD = "graph 2026-09-12 · 20:05"

const localStorageKey = "graph-visited"
function getVisited(): Set<SimpleSlug> {
  return new Set(JSON.parse(localStorage.getItem(localStorageKey) ?? "[]"))
}

function addToVisited(slug: SimpleSlug) {
  const visited = getVisited()
  visited.add(slug)
  localStorage.setItem(localStorageKey, JSON.stringify([...visited]))
}

type TweenNode = {
  update: (time: number) => void
  stop: () => void
}

async function renderGraph(graph: HTMLElement, fullSlug: FullSlug) {
  const slug = simplifySlug(fullSlug)
  const visited = getVisited()
  removeAllChildren(graph)

  let {
    drag: enableDrag,
    zoom: enableZoom,
    depth,
    scale,
    repelForce,
    centerForce,
    linkDistance,
    fontSize,
    opacityScale,
    removeTags,
    showTags,
    focusOnHover,
    enableRadial,
  } = JSON.parse(graph.dataset["cfg"]!) as D3Config

  try { await document.fonts.load("400 1em 'Barlow Condensed'") } catch (_) {}

  const data: Map<SimpleSlug, ContentDetails> = new Map(
    Object.entries<ContentDetails>(await fetchData).map(([k, v]) => [
      simplifySlug(k as FullSlug),
      v,
    ]),
  )
  const links: SimpleLinkData[] = []
  const tags: SimpleSlug[] = []
  // The vault's own front page links to every cluster and half the terms, so as a node it
  // is a hub that carries no meaning: everything is one hop from it. Leave it out.
  // simplifySlug("index") returns "/", not "" — and "/".split("/") has two parts, which is
  // why a check on segment count let the front page through and even put it in capitals.
  const isVaultIndex = (id: string) => id === "/" || id === "" || id.split("/").length <= 1
  const validLinks = new Set([...data.keys()].filter((k) => !isVaultIndex(k)))

  const tweens = new Map<string, TweenNode>()
  for (const [source, details] of data.entries()) {
    if (isVaultIndex(source)) continue
    const outgoing = details.links ?? []

    for (const dest of outgoing) {
      if (validLinks.has(dest)) {
        links.push({ source: source, target: dest })
      }
    }

    if (showTags) {
      const localTags = details.tags
        .filter((tag) => !removeTags.includes(tag))
        .map((tag) => simplifySlug(("tags/" + tag) as FullSlug))

      tags.push(...localTags.filter((tag) => !tags.includes(tag)))

      for (const tag of localTags) {
        links.push({ source: source, target: tag })
      }
    }
  }

  // clusterPath = 2nd slug segment (e.g. "Gender--and--Identity") — works at any nesting depth
  const slugParts = slug.split('/')
  const clusterPath = slugParts.length >= 2 ? slugParts[1] : null
  const clusterIndexSlug = slugParts.length >= 2 ? (slugParts.slice(0, 2).join('/') as SimpleSlug) : null

  // depth is counted down to -1 while the neighbourhood is walked below, so anything that
  // still needs to know whether this is a local or a global graph has to read it first.
  const isLocalGraph = depth >= 0

  const neighbourhood = new Set<SimpleSlug>()
  const wl: (SimpleSlug | "__SENTINEL")[] = [slug, "__SENTINEL"]
  if (depth >= 0) {
    while (depth >= 0 && wl.length > 0) {
      // compute neighbours
      const cur = wl.shift()!
      if (cur === "__SENTINEL") {
        depth--
        wl.push("__SENTINEL")
      } else {
        neighbourhood.add(cur)
        const outgoing = links.filter((l) => l.source === cur)
        const incoming = links.filter((l) => l.target === cur)
        wl.push(...outgoing.map((l) => l.target), ...incoming.map((l) => l.source))
      }
    }
  } else {
    validLinks.forEach((id) => neighbourhood.add(id))
    if (showTags) tags.forEach((tag) => neighbourhood.add(tag))
  }

  // Save depth-1 neighbourhood before expanding — these nodes always stay visible
  const baseNeighbourhood = new Set(neighbourhood)

  // Load all cluster siblings into the graph so the cluster toggle can reveal them
  // Skip source nodes — they belong to specific entries, not to the cluster as a whole
  if (clusterPath) {
    for (const id of validLinks) {
      if (id.includes(clusterPath) && id !== slug) {
        const siblingTags = data.get(id)?.tags ?? []
        if (!siblingTags.includes('source')) {
          neighbourhood.add(id)
        }
      }
    }
  }

  // A cluster's About page is two slug segments deep. Setting it in capitals gives the
  // graph the same reading order as the vault itself: cluster above term.
  const isClusterIndex = (url: SimpleSlug) => url !== "/" && url.split("/").length === 2

  // Only this entry's own literature. A source that belongs to a neighbour — Virtual
  // Influencer's secondary sources, say — reached the graph because the neighbour is one
  // hop away, and then sat here as if it supported the term being read. It does not.
  const centreIsLit = (data.get(slug)?.tags ?? []).includes("source") || isSourcesFolderPage(slug)
  for (const id of [...neighbourhood]) {
    if (id === slug) continue
    const isSource = (data.get(id)?.tags ?? []).includes("source") || isSourcesFolderPage(id)
    if (!isSource) continue
    // The Sources overview is a table of contents, not literature: on a term page the two
    // primaries and the bundle already say everything it would, so it stays off the graph
    // there. On its own page and on a source file's page it remains a neighbour.
    if (isSourcesFolderPage(id) && !centreIsLit) {
      neighbourhood.delete(id)
      continue
    }
    // Living in the entry's own folder is the test, not being linked to it: a source file
    // lists the entries it covers, so "Secondary Sources — Virtual Influencer" links here
    // and passed a link-based check while belonging to another term entirely.
    // A folder entry's slug ends in a slash ("…/Incel/"), a flat entry's does not; without
    // the trim the test looked for "…/Incel//" and threw the entry's own literature away.
    const livesHere = id.startsWith(`${slug.replace(/\/$/, "")}/`)
    if (!livesHere) neighbourhood.delete(id)
  }

  const nodes = [...neighbourhood].map((url) => {
    let title = url.startsWith("tags/") ? "#" + url.substring(5) : (data.get(url)?.title ?? url)
    // On the entry's own page its bundle is just "Secondary Sources": the " — Term" suffix
    // says nothing here, and as the longest name on the ring it was setting where the rim
    // sits for the whole picture.
    if (url !== slug && (data.get(url)?.tags ?? []).includes("secondary")) {
      title = title.replace(/\s+[—–-]\s+.*$/, "")
    }
    const text = isClusterIndex(url) ? title.toUpperCase() : title
    return {
      id: url,
      text,
      tags: data.get(url)?.tags ?? [],
    }
  })
  const graphData: { nodes: NodeData[]; links: LinkData[] } = {
    nodes,
    links: links
      .filter((l) => neighbourhood.has(l.source) && neighbourhood.has(l.target))
      .map((l) => ({
        source: nodes.find((n) => n.id === l.source)!,
        target: nodes.find((n) => n.id === l.target)!,
      })),
  }

  const width = graph.offsetWidth
  const height = Math.max(graph.offsetHeight, 250)

  // we virtualize the simulation and use pixi to actually render it
  const simulation: Simulation<NodeData, LinkData> = forceSimulation<NodeData>(graphData.nodes)
    .force("charge", forceManyBody().strength(-100 * repelForce))
    .force("center", forceCenter().strength(centerForce))
    .force("link", forceLink(graphData.links).distance(linkDistance))
    .force("collide", forceCollide<NodeData>((n) => nodeRadius(n)).iterations(3))

  // The entry you are reading is the centre of its own graph, so it is pinned there
  // instead of drifting wherever the forces happen to push it. Everything else arranges
  // itself around that fixed point, which also keeps the layout stable between visits.
  const centreNode = isLocalGraph ? graphData.nodes.find((n) => n.id === slug) : undefined
  if (centreNode) {
    centreNode.fx = 0
    centreNode.fy = 0
  }

  // Terms group by cluster around that centre, each cluster in its own direction, so the
  // graph reads the way the vault is organised instead of as one undifferentiated cloud.
  const clusterOf = (id: SimpleSlug | string) => {
    const parts = id.split("/")
    return parts.length >= 2 ? parts[1] : null
  }

  // EXPERIMENT (10-09) — short names for the map only, easy to remove: delete this map and
  // the lookup below it. Cluster titles are written as headings for the vault, which makes
  // them good descriptions and poor captions: "Subcultural Vocabulary and Platform
  // Language" is forty-four characters beside a ring. The full title stays untouched
  // everywhere else. If this survives its first audience, it belongs in the cluster's own
  // frontmatter as `short_title` rather than in code.
  const shortClusterTitles: Record<string, string> = {
    "Beauty,-Influencers--and--Self-Image": "Beauty & Self-Image",
    "Consequences-of-Digital-Behaviour": "Consequences",
    "Culture-Wars-and-Political-Language": "Culture Wars",
    "Design-Philosophy-and-Ethical-Design": "Ethical Design",
    "End-Times-Thinking-and-Elite-Survivalism": "End-Times Thinking",
    "Inclusion,-Accessibility-and-Ageing": "Inclusion & Ageing",
    "New-Digital-Professions": "Digital Professions",
    "Platform-Mechanisms--and--Economics": "Platform Mechanisms",
    "Privacy,-Data-and-Control": "Privacy & Data",
    "Statements-as-Analytical-Object": "Statements",
    "Subcultural-Vocabulary-and-Platform-Language": "Subcultural Vocabulary",
  }

  const clusterTitle = (segment: string) => {
    const short = shortClusterTitles[segment]
    const indexTitle = data.get(`${slugParts[0]}/${segment}` as SimpleSlug)?.title
    return (short ?? indexTitle ?? segment.replaceAll("--and--", " & ").replaceAll("-", " ")).toUpperCase()
  }

  const clusterSegments = [
    ...new Set(
      graphData.nodes
        .map((n) => clusterOf(n.id))
        .filter((c): c is string => !!c && c !== clusterOf(slug)),
    ),
  ].sort()

  // The reading entry's own cluster keeps the top of the circle; the rest fan out around it.
  const ownCluster = clusterOf(slug)
  const orderedClusters = ownCluster ? [ownCluster, ...clusterSegments] : clusterSegments
  const clusterAngle = new Map<string, number>(
    orderedClusters.map((c, i) => [c, (i / orderedClusters.length) * 2 * Math.PI - Math.PI / 2]),
  )
  const groupRadius = (Math.min(width, height) / 2) * 0.55

  const clusterAnchor = (n: NodeData) => {
    const c = clusterOf(n.id)
    const angle = c ? clusterAngle.get(c) : undefined
    if (angle === undefined) return { x: 0, y: 0 }
    return { x: Math.cos(angle) * groupRadius, y: Math.sin(angle) * groupRadius }
  }

  if (isLocalGraph && orderedClusters.length > 1) {
    // Strong enough that a cluster becomes a visible clump you can point at. The earlier
    // 0.09 left the groups so loose that their names landed on top of each other in the
    // middle, which is what made the picture unreadable.
    const groupStrength = (n: NodeData) => (n.id === slug ? 0 : 0.17)
    simulation
      .force("clusterGroupX", forceX<NodeData>((n) => clusterAnchor(n).x).strength(groupStrength))
      .force("clusterGroupY", forceY<NodeData>((n) => clusterAnchor(n).y).strength(groupStrength))
  }

  const radius = (Math.min(width, height) / 2) * 0.8
  if (enableRadial) simulation.force("radial", forceRadial(radius).strength(0.2))

  // precompute style prop strings as pixi doesn't support css variables
  const cssVars = [
    "--secondary",
    "--tertiary",
    "--gray",
    "--light",
    "--lightgray",
    "--dark",
    "--darkgray",
    "--bodyFont",
  ] as const
  const computedStyleMap = cssVars.reduce(
    (acc, key) => {
      acc[key] = getComputedStyle(document.documentElement).getPropertyValue(key).trim()
      return acc
    },
    {} as Record<(typeof cssVars)[number], string>,
  )

  // calculate color
  const clusterColor = (id: string): string | null => {
    if (id.includes("Platform-Mechanisms"))       return "#D94A4A"
    if (id.includes("AI-Specific"))               return "#0E9272"
    if (id.includes("AI-and-Energy"))             return "#3F51B5"
    if (id.includes("Gender"))                    return "#C56A1A"
    if (id.includes("Parents"))                   return "#B88900"
    if (id.includes("Relationships"))             return "#168AAD"
    if (id.includes("Students"))                  return "#6A5ACD"
    if (id.includes("Beauty"))                    return "#C653A0"
    if (id.includes("Counter-Movements"))         return "#9B3A6D"
    if (id.includes("Design-Philosophy"))         return "#6A8F1F"
    if (id.includes("SF-as-Ideology"))            return "#0097A7"
    if (id.includes("Culture-Wars"))              return "#C44536"
    if (id.includes("Society-and-Power"))         return "#228B4E"
    if (id.includes("Privacy"))                   return "#2F80C0"
    if (id.includes("Inclusion"))                 return "#607D8B"
    if (id.includes("Manifestos"))                return "#7B3FA1"
    if (id.includes("Statements-as"))             return "#455A64"
    if (id.includes("End-Times"))                 return "#C62828"
    if (id.includes("New-Digital-Professions"))   return "#1976D2"
    if (id.includes("Subcultural"))               return "#B83280"
    if (id.includes("Consequences"))              return "#00897B"
    return null
  }

  const color = (d: NodeData) => {
    const isCurrent = d.id === slug
    if (isCurrent) {
      return computedStyleMap["--secondary"]
    }
    const cc = clusterColor(d.id)
    if (cc) {
      return cc
    } else if (visited.has(d.id) || d.id.startsWith("tags/")) {
      return computedStyleMap["--tertiary"]
    } else {
      return computedStyleMap["--gray"]
    }
  }

  function nodeRadius(d: NodeData) {
    const numLinks = graphData.links.filter(
      (l) => l.source.id === d.id || l.target.id === d.id,
    ).length
    return 2 + Math.sqrt(numLinks)
  }

  let hoveredNodeId: string | null = null
  let hoveredNeighbours: Set<string> = new Set()

  // Pointing at a cluster — its name on the rim, or its row in the legend — lights up its
  // terms on the ring and the lines to them, and fades the rest. Pointing at a term does the
  // reverse in the draw loop: its cluster's name and arc come forward.
  let hoveredCluster: string | null = null
  // One mechanism for every row of the legend: keep what the row names, fade the rest.
  function setFocus(
    keepNode: ((n: NodeRenderData) => boolean) | null,
    keepLink: ((l: LinkRenderData) => boolean) | null,
  ) {
    for (const n of nodeRenderData) {
      if (n.simulationData.id === slug) continue
      const dim = keepNode !== null && !keepNode(n)
      n.gfx.alpha = dim ? 0.3 : 1
      if (n.label) n.label.alpha = dim ? 0.3 : 1
    }
    for (const l of linkRenderData) {
      l.active = keepLink !== null && keepLink(l)
    }
  }
  const endsOf = (l: LinkRenderData) => [
    (l.simulationData.source as NodeData).id,
    (l.simulationData.target as NodeData).id,
  ]
  function setHoveredCluster(segment: string | null) {
    hoveredCluster = segment
    setFocus(
      segment === null ? null : (n) => clusterOf(n.simulationData.id) === segment,
      segment === null ? null : (l) => endsOf(l).some((id) => clusterOf(id) === segment),
    )
  }
  // A relation row (related term, backlink, cluster page) keeps the lines of that kind and
  // the terms at their far end.
  function setHoveredRelation(kind: string | null) {
    if (kind === null) return setFocus(null, null)
    const far = new Set<string>()
    for (const l of linkRenderData) {
      if (l.relation !== kind) continue
      for (const id of endsOf(l)) if (id !== slug) far.add(id)
    }
    setFocus((n) => far.has(n.simulationData.id), (l) => l.relation === kind)
  }
  // A literature row keeps the books of that kind.
  function setHoveredLiterature(mark: string | null) {
    if (mark === null) return setFocus(null, null)
    setFocus((n) => literatureMark(n.simulationData, n.simulationData.id) === mark, () => false)
  }
  const linkRenderData: LinkRenderData[] = []
  const nodeRenderData: NodeRenderData[] = []
  function updateHoverInfo(newHoveredId: string | null) {
    hoveredNodeId = newHoveredId
    labelsNeedPlacing = true

    if (newHoveredId === null) {
      hoveredNeighbours = new Set()
      for (const n of nodeRenderData) {
        n.active = false
      }

      for (const l of linkRenderData) {
        l.active = false
      }
    } else {
      hoveredNeighbours = new Set()
      for (const l of linkRenderData) {
        const linkData = l.simulationData
        if (linkData.source.id === newHoveredId || linkData.target.id === newHoveredId) {
          hoveredNeighbours.add(linkData.source.id)
          hoveredNeighbours.add(linkData.target.id)
        }

        l.active = linkData.source.id === newHoveredId || linkData.target.id === newHoveredId
      }

      for (const n of nodeRenderData) {
        n.active = hoveredNeighbours.has(n.simulationData.id)
      }
    }
  }

  let dragStartTime = 0
  let dragging = false
  let draggedNodeId: string | null = null

  function renderLinks() {
    tweens.get("link")?.stop()
    const tweenGroup = new TweenGroup()

    for (const l of linkRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      // with full alpha and the rest with default alpha
      if (hoveredNodeId) {
        alpha = l.active ? 1 : 0.2
      }

      // A line takes the colour of the cluster it runs to, so a glance shows where a term
      // reaches outside its own neighbourhood. Hovering still darkens the ones you touch.
      l.color = l.active ? computedStyleMap["--gray"] : (l.restColor ?? computedStyleMap["--lightgray"])
      tweenGroup.add(new Tweened<LinkRenderData>(l).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("link", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  // Adjustable from the sliders in the loupe overlay; 1 keeps the original size.
  let labelSizeFactor = 1

  function renderLabels() {
    tweens.get("label")?.stop()
    const tweenGroup = new TweenGroup()

    const defaultScale = (1 / scale) * labelSizeFactor
    const activeScale = defaultScale * 1.1
    for (const n of nodeRenderData) {
      const nodeId = n.simulationData.id

      if (hoveredNodeId === nodeId) {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: 1,
              scale: { x: activeScale, y: activeScale },
            },
            100,
          ),
        )
      } else {
        tweenGroup.add(
          new Tweened<Text>(n.label).to(
            {
              alpha: n.label.alpha,
              scale: { x: defaultScale, y: defaultScale },
            },
            100,
          ),
        )
      }
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("label", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderNodes() {
    tweens.get("hover")?.stop()

    const tweenGroup = new TweenGroup()
    for (const n of nodeRenderData) {
      let alpha = 1

      // if we are hovering over a node, we want to highlight the immediate neighbours
      if (hoveredNodeId !== null && focusOnHover) {
        alpha = n.active ? 1 : 0.2
      }

      tweenGroup.add(new Tweened<Graphics>(n.gfx, tweenGroup).to({ alpha }, 200))
    }

    tweenGroup.getAll().forEach((tw) => tw.start())
    tweens.set("hover", {
      update: tweenGroup.update.bind(tweenGroup),
      stop() {
        tweenGroup.getAll().forEach((tw) => tw.stop())
      },
    })
  }

  function renderPixiFromD3() {
    renderNodes()
    renderLinks()
    renderLabels()
  }

  tweens.forEach((tween) => tween.stop())
  tweens.clear()

  const app = new Application()
  await app.init({
    width,
    height,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    backgroundAlpha: 0,
    preference: "webgl",
    resolution: window.devicePixelRatio,
    eventMode: "static",
  })
  graph.appendChild(app.canvas)

  const stage = app.stage
  stage.interactive = false

  const labelsContainer = new Container<Text>({ zIndex: 3, isRenderGroup: true })
  const nodesContainer = new Container<Graphics>({ zIndex: 2, isRenderGroup: true })
  const linkContainer = new Container<Graphics>({ zIndex: 1, isRenderGroup: true })
  const linkLabelsContainer = new Container<Text>({ zIndex: 2, isRenderGroup: true })
  const clusterLabelsContainer = new Container<Text>({ zIndex: 0, isRenderGroup: true })
  stage.addChild(
    clusterLabelsContainer,
    nodesContainer,
    labelsContainer,
    linkContainer,
    linkLabelsContainer,
  )

  // The global graph has hundreds of nodes, so there the labels keep fading in with zoom.
  // In the local graph — and in the loupe, which uses the same config — the words are the
  // point, so they stay readable without hovering.
  const labelsAlwaysVisible = isLocalGraph

  for (const n of graphData.nodes) {
    const nodeId = n.id

    const label = new Text({
      // The name is the target you actually aim at: a node drawn at 0.65 size is a dot of
      // four pixels, and the label beside it is twenty times the area.
      interactive: true,
      eventMode: "static",
      cursor: "pointer",
      // The book says this is literature before the name is read; the dotted tie says whose.
      // Which book says which kind: the protocol allows two primary sources per entry and
      // bundles the rest, and that difference should be countable in the picture.
      // Literature carries its mark on the node itself (below), so the name stays a name.
      text: n.text,
      alpha: labelsAlwaysVisible ? 1 : 0,
      anchor: { x: 0.5, y: 1.2 },
      style: {
        fontSize: fontSize * (nodeId === slug ? 19 : 15),
        // A term's name carries its cluster colour, like its dot does — so the ring reads
        // as coloured groups even where the arc name has scrolled out of view. The entry
        // itself stays in the text colour: it is the subject, not one of the neighbours.
        fill: nodeId === slug ? computedStyleMap["--dark"] : (color(n) ?? computedStyleMap["--dark"]),
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: nodeId === slug ? "700" : "400",
        stroke: { color: computedStyleMap["--light"], width: 4, join: "round" },
      },
      resolution: window.devicePixelRatio * 4,
    })
    label.scale.set(1 / scale)

    let oldLabelOpacity = 0
    const isTagNode = nodeId.startsWith("tags/")
    const isSourceNode = n.tags.includes("source")
    const nodeColor = color(n)

    const gfx = new Graphics({
      interactive: true,
      label: nodeId,
      eventMode: "static",
      hitArea: new Circle(0, 0, Math.max(nodeRadius(n) + 2, 9)),
      cursor: "pointer",
    })

    const mark = literatureMark(n, nodeId)
    if (mark) {
      // The mark is the node. A book where a dot would be says "literature" before the
      // name is read, and it stays put whichever way the label runs along its spoke —
      // a mark inside the label flipped sides on the left half of the ring.
      const icon = new Text({
        interactive: false,
        eventMode: "none",
        text: mark,
        anchor: { x: 0.5, y: 0.5 },
        style: { fontSize: Math.max(nodeRadius(n) * 3.2, 11) },
        resolution: window.devicePixelRatio * 2,
      })
      gfx.addChild(icon)
      if (nodeId === slug) {
        gfx.circle(0, 0, nodeRadius(n) + 6).fill({ color: 0x000000, alpha: 0 })
      }
    } else if (isSourceNode) {
      // Ring: transparent fill + colored stroke
      gfx.circle(0, 0, nodeRadius(n) + 1)
        .fill({ color: 0x000000, alpha: 0 })
        .stroke({ width: 2, color: nodeColor })
    } else if (isTagNode) {
      gfx.circle(0, 0, nodeRadius(n))
        .fill({ color: computedStyleMap["--light"] })
        .stroke({ width: 2, color: computedStyleMap["--tertiary"] })
    } else {
      // The entry itself wears its cluster's colour, with the orange ring on top saying
      // "you are here": the graph never said which cluster the term belonged to, only
      // which clusters its neighbours did.
      const fillColor = nodeId === slug ? (clusterColor(nodeId) ?? nodeColor) : nodeColor
      gfx.circle(0, 0, nodeRadius(n))
        .fill({ color: fillColor })
    }

    gfx
      .on("pointerover", (e) => {
        updateHoverInfo(e.target.label)
        oldLabelOpacity = label.alpha
        if (!dragging) {
          renderPixiFromD3()
        }
      })
      .on("pointerleave", () => {
        updateHoverInfo(null)
        label.alpha = oldLabelOpacity
        if (!dragging) {
          renderPixiFromD3()
        }
      })

    if (nodeId === slug) {
      gfx.stroke({ width: 3, color: "#FF6B00" })
    }

    label
      .on("pointerover", () => {
        updateHoverInfo(nodeId)
        if (!dragging) renderPixiFromD3()
      })
      .on("pointerleave", () => {
        updateHoverInfo(null)
        if (!dragging) renderPixiFromD3()
      })
      .on("pointertap", () => {
        window.spaNavigate(new URL(resolveRelative(fullSlug, nodeId), window.location.toString()))
      })

    gfx.on("pointertap", () => {
      window.spaNavigate(new URL(resolveRelative(fullSlug, nodeId), window.location.toString()))
    })

    nodesContainer.addChild(gfx)
    labelsContainer.addChild(label)

    const nodeRenderDatum: NodeRenderData = {
      simulationData: n,
      gfx,
      label,
      color: color(n),
      alpha: 1,
      active: false,
    }

    nodeRenderData.push(nodeRenderDatum)
  }

  // What kind of relation a line stands for. The vault distinguishes these anyway — a
  // source file is not a sibling term, and a link you made is not a link someone made to
  // you — but until now the graph drew all four the same way.
  // On a term page, a line to a source file is literature hanging off the entry, and it gets
  // the dotted tie. On a source page the page itself is the literature, so that rule would
  // turn every line out of the middle into "source" and draw none of them: the entries
  // this source serves floated on the ring with no line back. There, the ordinary readings
  // apply — the entries are what this page is related to.
  const centreIsLiterature = (() => {
    const centre = graphData.nodes.find((n) => n.id === slug)
    return !!centre && (centre.tags.includes("source") || isSourcesFolderPage(centre.id))
  })()
  function linkRelation(src: NodeData, tgt: NodeData): string {
    const isLiterature = (n: NodeData) => n.tags.includes("source") || isSourcesFolderPage(n.id)
    if (!centreIsLiterature && (isLiterature(src) || isLiterature(tgt))) return "source"
    if (src.id === clusterIndexSlug || tgt.id === clusterIndexSlug) return "cluster"
    if (src.id === slug) return "related term"
    if (tgt.id === slug) return "backlink"
    return "between neighbours"
  }

  // Only in the loupe: at 250px the lines are too short to carry a mark.
  // Also on a crowded entry. They were dropped there while the picture was still a cloud;
  // with a ring, cluster arcs and spoke labels it can carry them.
  const showLinkLabels = !!graph.closest(".expanded-graph-outer")

  // A mark instead of a word. The arrow does double duty: rotated onto the line it points
  // from the page that links to the page linked, so wikilink, backlink and related term are
  // one symbol read three ways depending on where the entry sits. What it cannot show is
  // the two kinds that are not links between terms at all, and those get their own mark.
  // The words here are the vault's own. A line running out of the entry is a related term,
  // because that is exactly what the Related terms line at the foot of the entry lists —
  // "wikilink" is Quartz's word for the same thing and appears nowhere a reader can see.
  // "Backlink" is kept: the sidebar panel already calls it that.
  // Arrows rather than triangles: at ten pixels on a line a chain-link icon turns to mud,
  // but the idea behind it survives in the return arrow — a link that comes back to you
  // without you having linked out.
  // Both arrows read the same way once they lie along their line: pointing at the end they
  // mean. ↩ points leftwards by itself, so aligned with the line it aimed back at the
  // neighbour — the opposite of what a backlink is. ↪ points the way the line runs.
  const relationGlyphs: Record<string, string> = {
    "related term": "→",
    backlink: "↪",
    cluster: "◇",
  }
  // A line between two neighbours gets no mark. The other four say something the picture
  // cannot: which way a link runs, whether the other end is a source, whether it is the
  // cluster page. That two neighbours are linked is already visible in the line not
  // touching the centre — a mark there only repeats the geometry, and those are the most
  // numerous lines of all.
  const relationGlyph = (relation: string) => relationGlyphs[relation] ?? ""

  // Three kinds of literature, three marks. A closed book for a primary source (the entry
  // may have two), a stack for the secondary bundle, a folder for the Sources overview.
  // A function declaration, because the labels are built before this point in the file.
  function literatureMark(n: NodeData, id: string): string {
    if (isSourcesFolderPage(id)) return "🗂"
    if (!n.tags.includes("source")) return ""
    if (n.tags.includes("primary")) return "📕"
    if (n.tags.includes("secondary")) return "📚"
    return "📖"
  }
  const literatureMeanings: Record<string, string> = {
    "📕": "primary source",
    "📚": "secondary sources",
    "🗂": "sources overview",
    "📖": "source",
  }

  const relationMeanings: Record<string, string> = {
    "→": "related term",
    "↪": "backlink",
    "◇": "cluster page",
    "┄": "source",
  }

  // Set along the arc of its own group, one letter at a time: a cluster name on a map
  // follows the shape it describes. Straight text can only sit beside a curve and point at
  // it; curved text is part of it.
  const clusterArcChars = new Map<string, Text[]>()

  // One faint name per cluster, sitting behind its own group of terms. Not tied to the
  // relation marks: those are dropped on a crowded entry, and that is exactly where the
  // cluster names are needed most.
  const showClusterNames = !!graph.closest(".expanded-graph-outer") && isLocalGraph
  const clusterNameLabels = new Map<string, Text>()
  if (showClusterNames && orderedClusters.length > 1) {
    for (const segment of orderedClusters) {
      const nameLabel = new Text({
        interactive: false,
        eventMode: "none",
        text: clusterTitle(segment),
        alpha: 0.3,
        anchor: { x: 0.5, y: 0.5 },
        style: {
          fontSize: fontSize * 12,
          fill: clusterColor(`x/${segment}`) ?? computedStyleMap["--gray"],
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: "400",
          letterSpacing: 2.5,
          // Cluster names run long — "End-Times Thinking and Elite Survivalism" is forty
          // characters. On one line it sweeps across half the picture; wrapped, it sits as
          // a block beside its own arc.
          wordWrap: true,
          wordWrapWidth: 150,
          align: "center",
          lineHeight: fontSize * 15,
        },
        resolution: window.devicePixelRatio * 4,
      })
      nameLabel.scale.set(1 / scale)
      clusterLabelsContainer.addChild(nameLabel)
      clusterNameLabels.set(segment, nameLabel)

      // The name is a link to the cluster's About page, letter by letter: each glyph is its
      // own hit target, so clicking anywhere on the name works.
      const clusterPage = `${slugParts[0]}/${segment}` as SimpleSlug
      const chars = [...clusterTitle(segment)].map((character) => {
        const glyph = new Text({
          interactive: true,
          eventMode: "static",
          cursor: "pointer",
          text: character,
          // Set out at the rim, bold so it reads as a heading over its arc rather than as
          // one more label among the terms.
          alpha: 0.7,
          anchor: { x: 0.5, y: 0.5 },
          style: {
            fontSize: fontSize * 18,
            fill: clusterColor(`x/${segment}`) ?? computedStyleMap["--gray"],
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: "700",
            letterSpacing: 3.5,
            stroke: { color: computedStyleMap["--light"], width: 3, join: "round" },
          },
          resolution: window.devicePixelRatio * 4,
        })
        glyph.scale.set(1 / scale)
        glyph.visible = false
        glyph.on("pointertap", () => {
          window.spaNavigate(new URL(resolveRelative(fullSlug, clusterPage), window.location.toString()))
        })
        glyph.on("pointerover", () => setHoveredCluster(segment))
        glyph.on("pointerout", () => setHoveredCluster(null))
        clusterLabelsContainer.addChild(glyph)
        return glyph
      })
      clusterArcChars.set(segment, chars)
    }
  }

  // The word over the literature's arc. Grey, because literature has no cluster colour;
  // a link to the Sources overview where the entry has one.
  const sourcesOverview = `${slug.replace(/\/$/, "")}/Sources/` as SimpleSlug
  const hasOverview = data.has(sourcesOverview)
  const sourceChars: Text[] = showClusterNames
    ? [..."SOURCES"].map((character) => {
        const glyph = new Text({
          interactive: hasOverview,
          eventMode: hasOverview ? "static" : "none",
          cursor: hasOverview ? "pointer" : "default",
          text: character,
          alpha: 0.7,
          anchor: { x: 0.5, y: 0.5 },
          style: {
            fontSize: fontSize * 18,
            fill: computedStyleMap["--gray"],
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: "700",
            letterSpacing: 3.5,
            stroke: { color: computedStyleMap["--light"], width: 3, join: "round" },
          },
          resolution: window.devicePixelRatio * 4,
        })
        glyph.scale.set(1 / scale)
        glyph.visible = false
        if (hasOverview) {
          glyph.on("pointertap", () => {
            window.spaNavigate(new URL(resolveRelative(fullSlug, sourcesOverview), window.location.toString()))
          })
        }
        clusterLabelsContainer.addChild(glyph)
        return glyph
      })
    : []

  for (const l of graphData.links) {
    const gfx = new Graphics({ interactive: false, eventMode: "none" })
    linkContainer.addChild(gfx)

    const relation = linkRelation(l.source as NodeData, l.target as NodeData)
    const away = (l.source as NodeData).id === slug ? (l.target as NodeData) : (l.source as NodeData)
    const restColor = clusterColor(away.id) ?? computedStyleMap["--lightgray"]

    let label: Text | undefined
    if (showLinkLabels && relationGlyph(relation)) {
      label = new Text({
        interactive: false,
        eventMode: "none",
        text: relationGlyph(relation),
        alpha: 0.95,
        // Sits on the line, not above it, with a halo in the background colour so the line
        // reads as interrupted by the word rather than drawn through it.
        anchor: { x: 0.5, y: 0.5 },
        style: {
          fontSize: fontSize * 13,
          fill: restColor,
          fontFamily: "'Barlow Condensed', sans-serif",
          stroke: { color: computedStyleMap["--light"], width: 4, join: "round" },
        },
        resolution: window.devicePixelRatio * 4,
      })
      label.scale.set(1 / scale)
      linkLabelsContainer.addChild(label)
    }

    const linkRenderDatum: LinkRenderData = {
      simulationData: l,
      gfx,
      label,
      relation,
      color: restColor,
      restColor,
      alpha: 1,
      active: false,
    }

    linkRenderData.push(linkRenderDatum)
  }

  // Cluster toggle starts closed — hide all cluster siblings on load
  for (const n of nodeRenderData) {
    if (isClusterNode(n.simulationData)) {
      n.gfx.visible = false
      n.label.visible = false
    }
  }
  for (const l of linkRenderData) {
    const src = l.simulationData.source as NodeData
    const tgt = l.simulationData.target as NodeData
    if (isClusterNode(src) || isClusterNode(tgt)) {
      l.gfx.visible = false
      if (l.label) l.label.visible = false
    }
  }

  let viewAdjustedByReader = false
  if (enableDrag) {
    select<HTMLCanvasElement, NodeData | undefined>(app.canvas).call(
      drag<HTMLCanvasElement, NodeData | undefined>()
        .container(() => app.canvas)
        .subject(() => graphData.nodes.find((n) => n.id === hoveredNodeId))
        .on("start", function dragstarted(event) {
          // Kept for what it really does here — telling a click apart from a scroll — but
          // the node itself no longer follows the pointer. Dragging rearranged a layout
          // that had already been worked out, and answered no question about the vault.
          draggedNodeId = event.subject.id
          event.subject.__initialDragPos = {
            x: event.subject.x,
            y: event.subject.y,
            fx: event.subject.fx,
            fy: event.subject.fy,
          }
          dragStartTime = Date.now()
          dragging = true
        })
        .on("drag", function dragged() {
          // deliberately empty: nodes stay where the layout put them
        })
        .on("end", function dragended(event) {
          if (!event.active) simulation.alphaTarget(0)
          event.subject.fx = null
          event.subject.fy = null
          draggedNodeId = null
          dragging = false

          // if the time between mousedown and mouseup is short, we consider it a click
          if (Date.now() - dragStartTime < 500) {
            const node = graphData.nodes.find((n) => n.id === event.subject.id) as NodeData
            const targ = resolveRelative(fullSlug, node.id)
            window.spaNavigate(new URL(targ, window.location.toString()))
          }
        }),
    )
  } else {
    for (const node of nodeRenderData) {
      node.gfx.on("click", () => {
        const targ = resolveRelative(fullSlug, node.simulationData.id)
        window.spaNavigate(new URL(targ, window.location.toString()))
      })
    }
  }

  if (enableZoom) {
    const zoomBehaviour = zoom<HTMLCanvasElement, NodeData>()
        .extent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([0.25, 4])
        .on("zoom", ({ transform, sourceEvent }) => {
          // Once the reader zooms or drags, the view is theirs and nothing recentres it.
          if (sourceEvent) viewAdjustedByReader = true
          labelsNeedPlacing = true
          stage.scale.set(transform.k, transform.k)
          stage.position.set(transform.x, transform.y)

          // zoom adjusts opacity of labels too
          const scale = transform.k * opacityScale
          let scaleOpacity = Math.max((scale - 1) / 3.75, 0)
          const activeNodes = nodeRenderData.filter((n) => n.active).flatMap((n) => n.label)

          for (const label of labelsContainer.children) {
            if (!activeNodes.includes(label)) {
              label.alpha = labelsAlwaysVisible ? 1 : scaleOpacity
            }
          }
        })

    select<HTMLCanvasElement, NodeData>(app.canvas).call(zoomBehaviour)
  }

  // No two words may sit on top of each other. Every few frames the labels are laid out in
  // order of importance — the node you are hovering, then the entry itself, then the
  // best-connected neighbours, and only then the relation labels — and anything that would
  // land on a box already taken is left unrendered. Raising Node spacing makes room and
  // the suppressed words come back on their own.
  function labelBox(label: Text) {
    const b = label.getBounds()
    return { x0: b.x - 2, y0: b.y - 1, x1: b.x + b.width + 2, y1: b.y + b.height + 1 }
  }

  type LabelBox = ReturnType<typeof labelBox>

  function updateLabelOcclusion() {
    const taken: LabelBox[] = []
    const overlaps = (b: LabelBox) =>
      taken.some((o) => !(b.x1 < o.x0 || b.x0 > o.x1 || b.y1 < o.y0 || b.y0 > o.y1))

    // Hiding a word was the wrong trade: a term you cannot read is a term that is not in
    // the graph. So a label that would land on an occupied spot moves instead — above the
    // node, below it, to its left, to its right — and only if none of those are free does
    // it give way.
    const placements: { x: number; y: number }[] = [
      { x: 0.5, y: 1.2 },
      { x: 0.5, y: -0.25 },
      { x: 1.1, y: 0.55 },
      { x: -0.1, y: 0.55 },
      { x: 0.5, y: 2.1 },
    ]

    const place = (n: NodeRenderData, unsuppressable = false) => {
      const label = n.label
      if (!label.visible) return
      const order = [n.placement ?? 0, ...placements.map((_, i) => i)]
      for (const index of order) {
        const anchor = placements[index]
        label.anchor.set(anchor.x, anchor.y)
        const box = labelBox(label)
        if (!overlaps(box)) {
          n.placement = index
          label.renderable = true
          taken.push(box)
          return
        }
      }
      label.anchor.set(placements[0].x, placements[0].y)
      n.placement = 0
      label.renderable = unsuppressable
      if (unsuppressable) taken.push(labelBox(label))
    }

    // Every line carries its relation, including the ones between two neighbours — those
    // are the "related term" connections, and leaving them blank made the picture look as
    // if only some links had a kind. The entry's own relations (or the hovered node's) are
    // laid out first, so when space runs out it is never one of those that gives way.
    const focus = hoveredNodeId ?? slug
    const touchesFocus = (l: LinkRenderData) =>
      (l.simulationData.source as NodeData).id === focus ||
      (l.simulationData.target as NodeData).id === focus

    const priority = (n: NodeRenderData) => {
      if (n.simulationData.id === hoveredNodeId) return Number.POSITIVE_INFINITY
      if (n.simulationData.id === slug) return Number.MAX_SAFE_INTEGER
      return nodeRadius(n.simulationData)
    }

    for (const n of [...nodeRenderData].sort((a, b) => priority(b) - priority(a))) {
      if (radialLayout && n.simulationData.id !== slug) {
        // Its slot is reserved by the geometry; there is nothing to dodge.
        n.label.renderable = n.label.visible
        if (n.label.visible) taken.push(labelBox(n.label))
        continue
      }
      // The entry you are reading always keeps its name, whatever else wants the space.
      place(n, n.simulationData.id === slug)
    }
    // Relation labels come last: a term you can read matters more than the word for the
    // kind of line it sits on.
    // Every line states its relation, always. A relation word cannot leave its line without
    // lying about which connection it describes, but it can slide along it: the middle
    // first, then either side of the middle. If nothing is free it is drawn anyway — a line
    // without a word would read as a connection of no particular kind, and there is no such
    // thing in this vault.
    const alongLine = [0.5, 0.38, 0.62, 0.28, 0.72]
    const alongLineFor = (l: LinkRenderData) =>
      l.labelT === undefined ? alongLine : [l.labelT, ...alongLine]
    const orderedLinks = [...linkRenderData].sort(
      (a, b) => Number(touchesFocus(b)) - Number(touchesFocus(a)),
    )
    for (const l of orderedLinks) {
      if (!l.label || !l.label.visible) continue
      const src = l.simulationData.source as NodeData
      const tgt = l.simulationData.target as NodeData
      l.label.renderable = true
      let settled = false
      for (const fraction of alongLineFor(l)) {
        l.label.position.set(
          (src.x ?? 0) + ((tgt.x ?? 0) - (src.x ?? 0)) * fraction + width / 2,
          (src.y ?? 0) + ((tgt.y ?? 0) - (src.y ?? 0)) * fraction + height / 2,
        )
        if (!overlaps(labelBox(l.label))) {
          l.labelT = fraction
          taken.push(labelBox(l.label))
          settled = true
          break
        }
      }
      if (!settled) l.labelT = 0.5
    }
  }

  // The legend lists only the clusters actually present in this graph, so a term that is
  // the sole representative of its cluster — and therefore gets no cluster name in the
  // picture — is still placed by its colour.
  const legendEl = graph
    .closest(".expanded-graph-outer")
    ?.querySelector(".graph-legend") as HTMLElement | null

  if (legendEl) {
    const literatureRows = Object.entries(literatureMeanings)
      .filter(([mark]) => graphData.nodes.some((n) => literatureMark(n, n.id) === mark))
      .map(([mark, meaning]) => {
        const row = document.createElement("span")
        row.className = "filter"
        const glyph = document.createElement("b")
        glyph.textContent = mark
        row.append(glyph, document.createTextNode(meaning))
        row.addEventListener("mouseenter", () => setHoveredLiterature(mark))
        row.addEventListener("mouseleave", () => setHoveredLiterature(null))
        return row
      })

    const present = [
      ...new Set(
        graphData.nodes
          .map((n) => clusterOf(n.id))
          .filter((c): c is string => !!c),
      ),
    ].sort((a, b) => clusterTitle(a).localeCompare(clusterTitle(b)))

    // Only the marks that actually occur in this graph, so the key never explains a symbol
    // the reader cannot find.
    const glyphsUsed = [
      ...new Set(linkRenderData.map((l) => relationGlyph(l.relation ?? ""))),
    ]
      .filter((glyph) => glyph !== "")
      .sort()

    const glyphRows = glyphsUsed.map((glyph) => {
      const row = document.createElement("span")
      row.className = "filter"
      const mark = document.createElement("b")
      mark.textContent = glyph
      const meaning = relationMeanings[glyph] ?? ""
      row.append(mark, document.createTextNode(meaning))
      const kind = meaning === "cluster page" ? "cluster" : meaning
      row.addEventListener("mouseenter", () => setHoveredRelation(kind))
      row.addEventListener("mouseleave", () => setHoveredRelation(null))
      return row
    })

    const clusterRows = present.map((segment) => {
      const row = document.createElement("span")
      row.className = "cluster"
      const swatch = document.createElement("i")
      swatch.style.backgroundColor = clusterColor(`x/${segment}`) ?? computedStyleMap["--gray"]
      // The row of the entry's own cluster is set bold and its dot ringed, the same ring
      // the entry wears in the middle; no words, because the legend has no room for them.
      if (segment === clusterOf(slug) && slug !== clusterIndexSlug) row.classList.add("own")
      row.append(swatch, document.createTextNode(clusterTitle(segment)))
      // The legend is not only a key. Pointing at a row lights the cluster up in the
      // picture, and clicking it opens the cluster's page, like the name on the rim.
      row.addEventListener("mouseenter", () => setHoveredCluster(segment))
      row.addEventListener("mouseleave", () => setHoveredCluster(null))
      row.addEventListener("click", () => {
        const clusterPage = `${slugParts[0]}/${segment}` as SimpleSlug
        window.spaNavigate(new URL(resolveRelative(fullSlug, clusterPage), window.location.toString()))
      })
      return row
    })

    const divider = document.createElement("hr")
    // A build stamp, so that "which version am I looking at" is answered by the legend
    // instead of by guessing at browser caches.
    const stamp = document.createElement("small")
    stamp.className = "stamp"
    stamp.textContent = GRAPH_BUILD
    legendEl.replaceChildren(...glyphRows, ...literatureRows, divider, ...clusterRows, stamp)
  }

  let labelsNeedPlacing = true
  let stopAnimation = false
  function animate(time: number) {
    if (stopAnimation) return
    for (const n of nodeRenderData) {
      const { x, y } = n.simulationData
      // Not `!x || !y`: the entry sits at exactly 0,0, and a falsy check on a coordinate
      // skipped the one node that is always there — it kept the position pixi gave it, in
      // the top-left corner, while its links were drawn from the real centre.
      if (x === undefined || y === undefined) continue
      n.gfx.position.set(x + width / 2, y + height / 2)
      if (n.label) {
        if (radialLayout && n.angle !== undefined) {
          const reach = (nodeRadius(n.simulationData) + 9) * (n.inward ? -1 : 1)
          // The direction the text runs: outward along the spoke, or, for a name that reads
          // inward, towards the centre. If that direction points left the text would stand
          // on its head, so it is turned around and anchored at its end instead — it then
          // still occupies the same stretch of spoke, read the right way up.
          const heading = n.inward ? n.angle + Math.PI : n.angle
          const facingRight = Math.cos(heading) >= 0
          n.label.anchor.set(facingRight ? 0 : 1, 0.5)
          n.label.position.set(
            x + Math.cos(n.angle) * reach + width / 2,
            y + Math.sin(n.angle) * reach + height / 2,
          )
          // The names run along their own spoke, like the spokes of a wheel: each one owns
          // its own wedge and cannot land on its neighbour. This used to switch on only past
          // the crowding threshold, with horizontal text kept wherever there was room — but
          // that made a sparse entry and a busy one into two different pictures, and reading
          // one is then no preparation for reading the next.
          n.label.rotation = facingRight ? heading : heading + Math.PI
        } else {
          n.label.position.set(x + width / 2, y + height / 2)
        }
      }
    }

    for (const l of linkRenderData) {
      const linkData = l.simulationData
      l.gfx.clear()
      // A source hangs from its term by a dotted tie, drawn below; a second solid line for
      // the same relation would say it twice.
      if (radialLayout && l.relation === "source") continue

      const sx = linkData.source.x! + width / 2
      const sy = linkData.source.y! + height / 2
      const tx = linkData.target.x! + width / 2
      const ty = linkData.target.y! + height / 2

      l.gfx.moveTo(sx, sy)
      if (radialLayout && l.relation === "between neighbours") {
        // A chord, not a straight line. Two neighbours linked to each other have nothing to
        // do with the middle, and a straight line between them cuts right through the entry
        // that the whole picture is about. Bending the line towards the centre keeps it
        // near the rim where both its ends are, and leaves the middle to the spokes.
        const cx = ((sx + tx) / 2 - width / 2) * 0.45 + width / 2
        const cy = ((sy + ty) / 2 - height / 2) * 0.45 + height / 2
        l.gfx
          .quadraticCurveTo(cx, cy, tx, ty)
          .stroke({ alpha: l.active ? l.alpha : l.alpha * 0.3, width: 1, color: l.color })
      } else {
        l.gfx
          .lineTo(tx, ty)
          .stroke({ alpha: l.active ? l.alpha : l.alpha * 0.3, width: 1, color: l.color })
      }

      if (l.label) {
        const t = l.labelT ?? 0.5
        l.label.position.set(
          linkData.source.x! + (linkData.target.x! - linkData.source.x!) * t + width / 2,
          linkData.source.y! + (linkData.target.y! - linkData.source.y!) * t + height / 2,
        )
        // Aligned with the line it belongs to. An arrow that lies along its own line points
        // at the end it means; upright, it only says "there is a direction here" and leaves
        // the reader to work out which.
        l.label.rotation = Math.atan2(
          linkData.target.y! - linkData.source.y!,
          linkData.target.x! - linkData.source.x!,
        )
      }
    }

    // Put the entry in the middle rather than asking the simulation to keep it there. fx/fy
    // are only honoured while the simulation ticks, so once it cools — or a drag ends off
    // canvas and never reports back — the entry stays wherever it happened to be. Writing
    // the coordinates here, every frame, leaves no route by which it can drift off centre.
    // The one exception is the entry being dragged, which has to be allowed to follow the
    // pointer until it is let go.
    if (centreNode && draggedNodeId !== slug) {
      centreNode.fx = 0
      centreNode.fy = 0
      centreNode.x = 0
      centreNode.y = 0
      centreNode.vx = 0
      centreNode.vy = 0
    }

    // Being at (0, 0) in the layout is not the same as being in the middle of the picture:
    // that depends on the canvas actually having the size the layout was measured against.
    // Rather than trust the measurement, aim the view — at the entry when this graph has
    // one, and otherwise at the middle of whatever is visible, so no page can end up with
    // its graph hanging in a corner.
    if (!viewAdjustedByReader) {
      let targetX = 0
      let targetY = 0
      if (!centreNode) {
        let count = 0
        for (const n of nodeRenderData) {
          if (!n.gfx.visible) continue
          targetX += n.simulationData.x ?? 0
          targetY += n.simulationData.y ?? 0
          count++
        }
        if (count > 0) {
          targetX /= count
          targetY /= count
        }
      }
      const visibleWidth = app.canvas.clientWidth || width
      const visibleHeight = app.canvas.clientHeight || height
      stage.position.set(
        visibleWidth / 2 - (targetX + width / 2) * stage.scale.x,
        visibleHeight / 2 - (targetY + height / 2) * stage.scale.y,
      )
    }

    // A cluster name sits in the middle of its own group, which only works because the
    // grouping force is strong enough to make that group a clump. A cluster with a single
    // visible term gets no name — the legend places that one by its colour instead.
    if (radialLayout) {
      clusterArc.clear()

      // The names ride on one common circle, just outside the longest term label, so they
      // read as a rim around the whole picture rather than as eleven separate captions.
      // One outlier — "Secondary Sources — Virtual Influencer" is twice the length of any
      // term — should not push the whole rim off the canvas, so the width that sets the
      // radius is capped.
      let widest = 0
      for (const n of nodeRenderData) {
        if (n.gfx.visible && n.simulationData.id !== slug && !n.inward) {
          widest = Math.max(widest, n.label.width)
        }
      }
      // The cap keeps one outlier from pushing the rim off the canvas. It is relative to the
      // ring, not the canvas, so that when the labels are enlarged and the ring is small the
      // rim still follows the names instead of stopping halfway through them.
      widest = Math.min(widest, ringRadius * 1.1)
      // Literature reads outward from the ring like the terms, but its names are longer
      // than most, so on an entry with sources the rim moves out until the dotted arc —
      // drawn 52 inside the rim — clears the longest of them.
      let literatureReach = 0
      for (const n of nodeRenderData) {
        if (n.gfx.visible && isLiteratureNode(n) && n.ring !== undefined) {
          literatureReach = Math.max(literatureReach, n.ring + n.label.width + 14)
        }
      }
      const arcRadius = Math.min(
        Math.max(ringRadius + widest + 30, literatureReach + 52 + 10),
        (Math.min(width, height) / 2) * 0.97,
      )

      // Every cluster that is present gets its arc and its name, however few terms it has
      // here. A single term with neither reads as unattached, when what it really is is the
      // one member of its group this entry happens to touch.
      // The literature closes the circle: a dotted arc over the band, with SOURCES on it
      // in the same letters as the cluster names. Dotted, because these are not terms.
      if (sourceArcSpan && sourceChars.length) {
        const [from, to] = sourceArcSpan
        const dash = 0.035
        for (let a = from; a < to; a += dash * 2) {
          clusterArc
            .arc(width / 2, height / 2, arcRadius - 52, a, Math.min(a + dash, to))
            .stroke({ width: 3, alpha: 0.6, color: computedStyleMap["--gray"] })
        }
        for (const glyph of sourceChars) glyph.scale.set((1 / scale) * labelSizeFactor)
        setOnArc(sourceChars, -Math.PI / 2, arcRadius)
      } else {
        for (const glyph of sourceChars) glyph.visible = false
      }

      // Which cluster comes forward: the one pointed at on the rim or in the legend, or the
      // cluster of the term under the pointer.
      const focusCluster =
        hoveredCluster ?? (hoveredNodeId && hoveredNodeId !== slug ? clusterOf(hoveredNodeId) : null)
      const named: { segment: string; chars: Text[]; angle: number; full: number; members: number }[] = []
      for (const [segment, nameLabel] of clusterNameLabels) {
        nameLabel.visible = false
        const chars = clusterArcChars.get(segment) ?? []
        for (const glyph of chars) glyph.visible = false
        const angle = clusterArcAngles.get(segment)
        const span = clusterArcSpans.get(segment)
        const members = nodeRenderData.filter(
          (n) => n.gfx.visible && clusterOf(n.simulationData.id) === segment,
        ).length
        if (angle === undefined || !span || members === 0) continue

        const [from, to] = span
        const inFocus = focusCluster === segment
        const home = segment === clusterOf(slug)
        clusterArc
          .arc(width / 2, height / 2, arcRadius - 52, from - 0.02, to + 0.02)
          .stroke({
            width: inFocus ? 6 : home ? 4.5 : 3,
            alpha: focusCluster ? (inFocus ? 0.95 : 0.3) : home ? 0.85 : 0.6,
            color: clusterColor(`x/${segment}`) ?? computedStyleMap["--gray"],
          })

        // Measured at full size, whatever the letters are scaled to right now, so the
        // fitting below starts from the same number every frame instead of chasing its own
        // result from the frame before.
        const full = chars.reduce(
          (sum, glyph) => sum + (glyph.scale.x ? glyph.width / glyph.scale.x : 0) + 1,
          0,
        )
        named.push({ segment, chars, angle, full, members })
      }

      // Three clusters with a single term each, side by side, all want the same stretch of
      // rim. Dropping the names that collide loses exactly the ones the reader most needs,
      // because a lone term is the one whose group cannot be guessed from its neighbours.
      // So they shrink to fit instead: the name stays, a little smaller, which also says
      // something true — this cluster is barely present here.
      named.sort((a, b) => a.angle - b.angle)
      const between = (i: number, j: number) => {
        let apart = Math.abs(named[j].angle - named[i].angle)
        return apart > Math.PI ? 2 * Math.PI - apart : apart
      }

      // Two lanes. A name that would collide with its neighbour on the rim steps out one
      // line, straight over its own arc, where the rim's names are no longer in its way; two
      // small clusters in a row then alternate. Thirteen clusters around one entry used to
      // cost the small ones their names, and those are the ones a reader cannot guess.
      const laneStep = (fontSize * 18 * labelSizeFactor) / scale + 6
      const lane = named.map(() => 0)
      const radiusOf = (i: number) => arcRadius + lane[i] * laneStep
      const halfAt = (i: number, f: number) =>
        ((named[i].full * f * labelSizeFactor) / scale / radiusOf(i)) / 2 + 0.03
      const clash = (i: number, j: number) => halfAt(i, 1) + halfAt(j, 1) > between(i, j)
      const lastIn = (l: number, before: number) => {
        for (let k = before - 1; k >= 0; k--) if (lane[k] === l) return k
        return -1
      }
      for (let i = 1; i < named.length; i++) {
        const prev0 = lastIn(0, i)
        if (prev0 < 0 || !clash(i, prev0)) continue
        const prev1 = lastIn(1, i)
        if (prev1 < 0 || !clash(i, prev1)) lane[i] = 1
      }
      // the ring closes: the last name meets the first again
      if (named.length > 2) {
        const last = named.length - 1
        if (lane[last] === lane[0] && clash(last, 0)) {
          const other = lane[last] === 0 ? 1 : 0
          const prevOther = lastIn(other, last)
          if (prevOther < 0 || !clash(last, prevOther)) lane[last] = other
        }
      }

      // Within a lane, what still collides shrinks to fit, as before.
      const fit = named.map(() => 1)
      const nextInLane = (i: number) => {
        for (let k = 1; k < named.length; k++) {
          const j = (i + k) % named.length
          if (lane[j] === lane[i]) return j
        }
        return i
      }
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < named.length; i++) {
          const next = nextInLane(i)
          if (next === i) continue
          const apart = between(i, next)
          const needed = halfAt(i, fit[i]) + halfAt(next, fit[next])
          if (needed <= apart) continue
          const shrink = apart / needed
          fit[i] *= shrink
          fit[next] *= shrink
        }
      }
      named.forEach((entry, i) => {
        // Past this point the name would be smaller than the terms it frames, which reads as
        // dirt on the rim rather than as a word. Then the arc carries it alone.
        if (fit[i] < 0.55) return
        const inFocus = focusCluster === entry.segment
        const boost = inFocus ? 1.25 : 1
        for (const glyph of entry.chars) {
          glyph.scale.set(((fit[i] * boost) / scale) * labelSizeFactor)
          glyph.alpha = focusCluster ? (inFocus ? 1 : 0.3) : 0.7
        }
        setOnArc(entry.chars, entry.angle, radiusOf(i))
      })
    } else
    for (const [segment, nameLabel] of clusterNameLabels) {
      let sx = 0
      let sy = 0
      let count = 0
      for (const n of nodeRenderData) {
        if (!n.gfx.visible || clusterOf(n.simulationData.id) !== segment) continue
        const nx = n.simulationData.x ?? 0
        const ny = n.simulationData.y ?? 0
        sx += nx
        sy += ny
        count++
      }
      nameLabel.visible = count > 1
      if (count > 1) {
        // Back in the middle of its own group now that the groups actually hold together.
        nameLabel.position.set(sx / count + width / 2, sy / count + height / 2)
      }
    }

    // Place the words once and leave them alone. Recomputing on a timer meant that two
    // equally good spots kept swapping, which reads as a shiver even though nothing in the
    // layout is moving. The placement is redone only when something actually changed: the
    // layout, a toggle, a slider, the zoom, or what you are hovering.
    // The dotted ties between a source and the term it belongs to.
    sourceTies.clear()
    if (radialLayout) {
      for (const [id, parent] of sourceParents) {
        const source = nodeRenderData.find((n) => n.simulationData.id === id)
        if (!source || !source.gfx.visible || !parent.gfx.visible) continue
        const x1 = (source.simulationData.x ?? 0) + width / 2
        const y1 = (source.simulationData.y ?? 0) + height / 2
        const x2 = (parent.simulationData.x ?? 0) + width / 2
        const y2 = (parent.simulationData.y ?? 0) + height / 2
        const span = Math.hypot(x2 - x1, y2 - y1)
        const steps = Math.max(2, Math.round(span / 6))
        for (let i = 0; i < steps; i += 2) {
          const a = i / steps
          const b = Math.min((i + 1) / steps, 1)
          sourceTies
            .moveTo(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a)
            .lineTo(x1 + (x2 - x1) * b, y1 + (y2 - y1) * b)
            .stroke({ width: 1, alpha: 0.5, color: source.color })
        }
      }
    }

    if (labelsNeedPlacing) {
      labelsNeedPlacing = false
      updateLabelOcclusion()
    }

    tweens.forEach((t) => t.update(time))
    app.renderer.render(stage)
    requestAnimationFrame(animate)
  }

  // A knowledge map should stand still. The simulation is run to rest in one go and then
  // stopped, so the picture is finished the moment it appears: no drift while you read, no
  // sixty ticks a second spent rearranging what was already settled, and the same entry
  // laid out the same way every time you open it.
  function settleLayout(alpha = 1, ticks = 320) {
    simulation.stop()
    simulation.alpha(alpha)
    for (let i = 0; i < ticks; i++) {
      simulation.tick()
    }
    labelsNeedPlacing = true
  }

  // A term with its direct neighbours is not a physics problem, it is a circle. Placing the
  // neighbours in fixed slots around the entry — clustered by colour, one arc per cluster —
  // reserves a place for every node and its name in advance. Nothing can collide, because
  // the geometry rules it out, and the same term is laid out the same way every time.
  // Also in the sidebar panel, not only in the loupe: one entry with its neighbours is the
  // same picture at both sizes, and it is confusing to open a graph that reorganises itself.
  const radialLayout = isLocalGraph && !!centreNode
  const baseRingRadius = (Math.min(width, height) / 2) * 0.5
  // Node spacing widens the ring here rather than pushing on forces that no longer run.
  let ringRadius = baseRingRadius

  function layoutRadial() {
    if (!radialLayout || !centreNode) return

    const visible = nodeRenderData.filter(
      (n) => n.gfx.visible && n.simulationData.id !== slug,
    )
    if (visible.length === 0) return

    // Literature is not vocabulary, so it does not belong among the terms. Sources — the
    // primary files and the Sources overview pages alike — take an inner ring of their own,
    // in the band between the entry and its neighbours.
    const sources = visible.filter(isLiteratureNode)
    const onRing = visible.filter((n) => !isLiteratureNode(n))

    if (onRing.length === 0) return

    const groups = new Map<string, NodeRenderData[]>()
    for (const n of onRing) {
      const key = clusterOf(n.simulationData.id) ?? "~"
      const group = groups.get(key)
      if (group) group.push(n)
      else groups.set(key, [n])
    }

    const own = clusterOf(slug)
    const order = [...groups.keys()].sort((a, b) => {
      if (a === own) return -1
      if (b === own) return 1
      return clusterTitle(a).localeCompare(clusterTitle(b))
    })

    // A gap between clusters is what makes them read as groups rather than as one ring.
    const gap = 0.16
    // The ring makes room at the top when there is literature to hang there: the opening
    // between the last cluster and the first widens with the number of sources, so no term
    // sits under the band and no cluster arc runs through a source name.
    const topSpread = Math.min(1.0, 0.3 * Math.max(sources.length - 1, 1))
    const topGap = sources.length ? Math.min(1.1, topSpread + 0.45) : gap
    sourceArcSpan = sources.length
      ? [-Math.PI / 2 - topGap / 2 + gap * 0.6, -Math.PI / 2 + topGap / 2 - gap * 0.6]
      : null
    const budget = 2 * Math.PI - gap * (order.length - 1) - topGap
    const step = budget / onRing.length
    let angle = -Math.PI / 2 + topGap / 2
    let placed = 0

    clusterArc.clear()
    for (const key of order) {
      const members = groups.get(key)!
      const from = angle
      for (const n of members) {
        n.angle = angle + step / 2
        // One true circle. Until 2026-09-12 a term with more ties to the entry sat a little
        // further in (4.5% per tie, up to three), an encoding nobody could read as such —
        // it only showed as the ring not being round once the literature sat on it too.
        // The size of a dot already says how many lines meet there.
        n.ring = ringRadius * 1.06
        n.inward = false
        placed += 1
        n.simulationData.x = Math.cos(n.angle) * n.ring
        n.simulationData.y = Math.sin(n.angle) * n.ring
        n.simulationData.fx = n.simulationData.x
        n.simulationData.fy = n.simulationData.y
        angle += step
      }
      const first = from + step / 2
      const last = angle - step / 2
      const mid = (first + last) / 2
      // A cluster with one term on the ring ran from its own centre to its own centre: an
      // arc of nothing, so that term sat on the rim looking unattached. Every cluster gets
      // at least the width of the slot it occupies.
      const half = Math.max((last - first) / 2, step * 0.42)
      clusterArcAngles.set(key, mid)
      clusterArcSpans.set(key, [mid - half, mid + half])
      angle += gap
    }

    sourceParents.clear()
    // Only the entry's own literature reaches this graph, so it hangs from the entry itself:
    // a short band across the top, between the ring of terms and the rim of cluster names,
    // tied back to the middle with a dotted line.
    sources.forEach((n, i) => {
      const parent = nodeRenderData.find((x) => x.simulationData.id === slug)
      const share = sources.length === 1 ? 0 : i / (sources.length - 1) - 0.5
      const at = -Math.PI / 2 + share * topSpread
      // On the ring itself, in the row with the terms, in the opening the ring leaves at the
      // top. The names read outward like every other name on the ring; the dotted SOURCES
      // arc is pushed out far enough to clear them (see arcRadius in the draw loop). An
      // inward band was tried twice on 2026-09-12 and read worse both times.
      const radius = ringRadius * 1.06

      n.angle = at
      n.ring = radius
      n.inward = false
      n.simulationData.x = Math.cos(at) * radius
      n.simulationData.y = Math.sin(at) * radius
      n.simulationData.fx = n.simulationData.x
      n.simulationData.fy = n.simulationData.y
      if (parent) sourceParents.set(n.simulationData.id, parent)
    })

    centreNode.x = 0
    centreNode.y = 0
    centreNode.fx = 0
    centreNode.fy = 0
    labelsNeedPlacing = true
  }

  // Text follows a circle by placing each letter at its own angle. Below the middle the arc
  // curves the other way: the letters keep their order and their rotation is mirrored while
  // the cursor walks backwards — reversing the letters as well mirrors the word, which is
  // how GENDER & IDENTITY once came out as YTITNEDI & REDNEG.
  function setOnArc(chars: Text[], centreAngle: number, radius: number) {
    const flipped = Math.sin(centreAngle) > 0
    const widths = chars.map((glyph) => glyph.width + 1)
    const span = widths.reduce((sum, w) => sum + w, 0) / radius
    let cursor = centreAngle - (flipped ? -span / 2 : span / 2)

    chars.forEach((glyph, i) => {
      const step = widths[i] / radius
      const at = cursor + (flipped ? -step / 2 : step / 2)
      glyph.visible = true
      glyph.position.set(
        Math.cos(at) * radius + width / 2,
        Math.sin(at) * radius + height / 2,
      )
      glyph.rotation = flipped ? at - Math.PI / 2 : at + Math.PI / 2
      cursor += flipped ? -step : step
    })
  }

  const isLiteratureNode = (n: NodeRenderData) =>
    n.simulationData.tags.includes("source") || isSourcesFolderPage(n.simulationData.id)

  const sourceParents = new Map<string, NodeRenderData>()
  const sourceTies = new Graphics()
  const clusterArc = new Graphics()
  const clusterArcAngles = new Map<string, number>()
  // start- and end angle per cluster, so the arc itself can be drawn: a name on its own
  // says which spot it belongs to, an arc says which stretch of the ring it owns
  const clusterArcSpans = new Map<string, [number, number]>()
  // the stretch of rim the literature occupies, so a dotted arc can close the circle there
  let sourceArcSpan: [number, number] | null = null
  clusterLabelsContainer.addChild(clusterArc as unknown as Text)
  linkContainer.addChild(sourceTies)

  if (radialLayout) {
    layoutRadial()
  } else {
    settleLayout()
  }

  requestAnimationFrame(animate)

  const sourceToggleEl = graph.closest(".graph")?.querySelector(".source-toggle") as HTMLDetailsElement | null
  const clusterToggleEl = graph.closest(".graph")?.querySelector(".cluster-toggle") as HTMLDetailsElement | null
  const backlinksToggleEl = graph.closest(".graph")?.querySelector(".backlinks-toggle") as HTMLDetailsElement | null

  function isSourceNode(n: NodeData) { return n.tags.includes("source") }

  // Sources/index.md overview pages aren't tagged "source" themselves, but they're
  // evidentiary infrastructure, not a term or a real inbound relation — exclude them
  // from cluster and backlink classification the same way Backlinks.tsx excludes them.
  // The overview page's id carries a trailing slash ("…/Sources/"); without the trim it
  // passed as a term and sat on the ring among the vocabulary.
  function isSourcesFolderPage(id: string) {
    const s = id.replace(/\/$/, "")
    return s.endsWith("/Sources") || s === "Sources"
  }

  const hasSourceNodes = nodeRenderData.some(n => n.simulationData.tags.includes("source"))
  if (!hasSourceNodes && sourceToggleEl) {
    sourceToggleEl.style.display = "none"
  }
  function isClusterNode(n: NodeData) {
    if (!clusterPath || !clusterIndexSlug) return false
    return (
      !baseNeighbourhood.has(n.id) &&
      n.id !== slug &&
      n.id !== clusterIndexSlug &&
      !n.tags.includes("source") &&
      !isSourcesFolderPage(n.id) &&
      n.id.includes(clusterPath)
    )
  }

  const hasClusterNodes = nodeRenderData.some((n) => isClusterNode(n.simulationData))
  if (!hasClusterNodes && clusterToggleEl) {
    clusterToggleEl.style.display = "none"
  }

  // Cluster ring — only meaningful in the local graph, where cluster siblings are loaded
  // purely so the toggle can reveal them. Most of them have no link to the current page,
  // and the link filter above drops any link with an invisible endpoint, so without this
  // they drift as unanchored noise. The cluster's About page acts as the hub, its sibling
  // terms settle on a ring around it. On the global graph baseNeighbourhood covers every
  // node, so isClusterNode is false throughout and none of this activates.
  const clusterRingCount = nodeRenderData.filter((n) => isClusterNode(n.simulationData)).length
  // Grow the ring when a cluster has too many terms to fit at a readable spacing
  const clusterRingRadius = Math.max(
    (Math.min(width, height) / 2) * 0.75,
    (clusterRingCount * 34) / (2 * Math.PI),
  )
  const ringForce = forceRadial<NodeData>(clusterRingRadius)
  const hubForceX = forceX<NodeData>(0)
  const hubForceY = forceY<NodeData>(0)
  let clusterRingStrength = 0

  // d3 caches strength values at initialize time, so re-calling .strength() is what
  // actually re-applies them — assigning to clusterRingStrength alone does nothing.
  function applyClusterRingStrength() {
    ringForce.strength((n) => (isClusterNode(n) ? clusterRingStrength : 0))
    hubForceX.strength((n) => (n.id === clusterIndexSlug ? clusterRingStrength * 0.6 : 0))
    hubForceY.strength((n) => (n.id === clusterIndexSlug ? clusterRingStrength * 0.6 : 0))
  }

  if (hasClusterNodes) {
    applyClusterRingStrength()
    simulation
      .force("clusterRing", ringForce)
      .force("clusterHubX", hubForceX)
      .force("clusterHubY", hubForceY)

    // TEMPORARY tuning handle — remove before committing. Lets the ring be compared
    // against the old behaviour on the same page, live, without a rebuild:
    // ring(0) is the old graph, ring(0.35) is the current setting.
    let tunedRadius = clusterRingRadius
    ;(window as any).ring = (strength?: number, radius?: number) => {
      if (typeof radius === "number") {
        tunedRadius = radius
        ringForce.radius(radius)
      }
      if (typeof strength === "number") clusterRingStrength = strength
      applyClusterRingStrength()
      simulation.alpha(0.6).restart()
      return { strength: clusterRingStrength, radius: Math.round(tunedRadius), onRing: clusterRingCount }
    }
  }

  // A node is a "backlink" node if the only reason it's in this graph is that
  // it links to the current page — the current page itself does not link out to it.
  const directOutgoing = new Set(links.filter((l) => l.source === slug).map((l) => l.target))
  const directIncoming = new Set(links.filter((l) => l.target === slug).map((l) => l.source))
  function isBacklinkNode(n: NodeData) {
    return (
      n.id !== slug &&
      directIncoming.has(n.id) &&
      !directOutgoing.has(n.id) &&
      !n.tags.includes("source") &&
      !isSourcesFolderPage(n.id)
    )
  }

  const hasBacklinkNodes = nodeRenderData.some((n) => isBacklinkNode(n.simulationData))
  if (!hasBacklinkNodes && backlinksToggleEl) {
    backlinksToggleEl.style.display = "none"
  }

  function updateToggleLabels() {
    if (sourceToggleEl) {
      const s = sourceToggleEl.querySelector("summary")
      if (s) s.textContent = sourceToggleEl.open ? "Hide Sources" : "Show Sources"
    }
    if (clusterToggleEl) {
      const s = clusterToggleEl.querySelector("summary")
      if (s) s.textContent = clusterToggleEl.open ? "Hide Cluster" : "Show Cluster"
    }
    if (backlinksToggleEl) {
      const s = backlinksToggleEl.querySelector("summary")
      if (s) s.textContent = backlinksToggleEl.open ? "Hide Backlinks" : "Show Backlinks"
    }
  }

  function applyToggles() {
    const showSources = sourceToggleEl ? sourceToggleEl.open : true
    const showCluster = clusterToggleEl ? clusterToggleEl.open : true
    const showBacklinks = backlinksToggleEl ? backlinksToggleEl.open : true
    for (const n of nodeRenderData) {
      if (isSourceNode(n.simulationData)) {
        n.gfx.visible = showSources
        n.label.visible = showSources
      } else if (isClusterNode(n.simulationData)) {
        n.gfx.visible = showCluster
        n.label.visible = showCluster
      } else if (isBacklinkNode(n.simulationData)) {
        n.gfx.visible = showBacklinks
        n.label.visible = showBacklinks
      }
    }
    for (const l of linkRenderData) {
      const src = l.simulationData.source as NodeData
      const tgt = l.simulationData.target as NodeData
      const visibility = (n: NodeData) =>
        isSourceNode(n) ? showSources : isClusterNode(n) ? showCluster : isBacklinkNode(n) ? showBacklinks : true
      l.gfx.visible = visibility(src) && visibility(tgt)
      if (l.label) l.label.visible = l.gfx.visible
    }

    // Only pull the ring into shape while the cluster is actually on screen — hidden
    // siblings shouldn't push the visible nodes around from behind the toggle.
    const nextRingStrength = showCluster ? 0.35 : 0
    if (hasClusterNodes && nextRingStrength !== clusterRingStrength) {
      clusterRingStrength = nextRingStrength
      applyClusterRingStrength()
      if (radialLayout) layoutRadial()
      else settleLayout(0.5, 200)
    }

    updateToggleLabels()
  }

  updateToggleLabels()
  sourceToggleEl?.addEventListener("toggle", applyToggles)
  clusterToggleEl?.addEventListener("toggle", applyToggles)
  backlinksToggleEl?.addEventListener("toggle", applyToggles)

  // Sliders for spacing, node size and label size. They live in the loupe overlay only —
  // the sidebar panel is too small to tune anything in — so the sidebar graph finds no
  // controls element and skips all of this. Values are kept in localStorage, because the
  // point of tuning is that the next entry you open is laid out the same way.
  const controlsEl = graph
    .closest(".expanded-graph-outer")
    ?.querySelector(".graph-controls") as HTMLElement | null

  const controlDefaults: Record<string, number> = { spacing: 1, nodeSize: 1, labelSize: 1 }
  const controlValues: Record<string, number> = { ...controlDefaults }

  function readStoredControls() {
    for (const key of Object.keys(controlDefaults)) {
      try {
        const raw = localStorage.getItem(`graph-control-${key}`)
        const parsed = raw === null ? NaN : Number.parseFloat(raw)
        if (Number.isFinite(parsed)) controlValues[key] = parsed
      } catch (_) {
        // private mode or blocked storage: defaults are fine
      }
    }
  }

  function storeControl(key: string, value: number) {
    try {
      localStorage.setItem(`graph-control-${key}`, String(value))
    } catch (_) {}
  }

  function applyControls(restart: boolean) {
    const { spacing, nodeSize, labelSize } = controlValues

    const linkForce = simulation.force("link") as ReturnType<typeof forceLink> | undefined
    linkForce?.distance(linkDistance * spacing)
    const chargeForce = simulation.force("charge") as ReturnType<typeof forceManyBody> | undefined
    chargeForce?.strength(-100 * repelForce * spacing)
    // The collision radius is what actually keeps labels apart: it reserves room around
    // each node, so raising spacing pushes neighbours out of each other's text.
    const collideForce = simulation.force("collide") as
      | ReturnType<typeof forceCollide<NodeData>>
      | undefined
    collideForce?.radius((n: NodeData) => (nodeRadius(n) * nodeSize + 14) * spacing)

    for (const n of nodeRenderData) {
      n.gfx.scale.set(nodeSize)
    }

    labelSizeFactor = labelSize
    for (const l of linkRenderData) {
      l.label?.scale.set((1 / scale) * labelSize)
    }
    renderLabels()

    if (radialLayout) {
      ringRadius = baseRingRadius * Math.min(spacing, 1.6)
    }

    if (restart) {
      if (radialLayout) layoutRadial()
      else settleLayout(0.4, 200)
    }
  }

  function syncControlInputs() {
    if (!controlsEl) return
    for (const key of Object.keys(controlDefaults)) {
      const input = controlsEl.querySelector(`input[data-control="${key}"]`) as HTMLInputElement | null
      const out = controlsEl.querySelector(`output[data-control-value="${key}"]`) as HTMLElement | null
      if (input) input.value = String(controlValues[key])
      if (out) out.textContent = controlValues[key].toFixed(2)
    }
  }

  function onControlInput(e: Event) {
    const input = e.target as HTMLInputElement
    const key = input.dataset["control"]
    if (!key || !(key in controlValues)) return
    const value = Number.parseFloat(input.value)
    if (!Number.isFinite(value)) return
    controlValues[key] = value
    storeControl(key, value)
    const out = controlsEl?.querySelector(`output[data-control-value="${key}"]`) as HTMLElement | null
    if (out) out.textContent = value.toFixed(2)
    applyControls(true)
  }

  function onControlReset() {
    for (const key of Object.keys(controlDefaults)) {
      controlValues[key] = controlDefaults[key]
      storeControl(key, controlDefaults[key])
    }
    syncControlInputs()
    applyControls(true)
  }

  const resetButton = controlsEl?.querySelector(".graph-controls-reset") as HTMLButtonElement | null

  // A picture of the graph as it stands, for a slide or a note. The renderer is asked for
  // the pixels rather than the canvas element: with webgl the drawing buffer is not kept
  // around after a frame, so reading the element straight off gives an empty image.
  const shotButton = graph
    .closest(".expanded-graph-outer")
    ?.querySelector(".graph-shot") as HTMLButtonElement | null

  async function saveGraphImage() {
    try {
      // The graph is drawn on a transparent background, which a PNG keeps and most viewers
      // show as black. Paint the page colour underneath first, so the image looks like what
      // was on screen.
      const rendered = app.renderer.extract.canvas({ target: stage }) as unknown as HTMLCanvasElement

      // The legend lives in the page, not on the canvas, so extracting the drawing alone
      // produced an image whose colours nothing explained. It is redrawn here from the same
      // rows the panel is built from, in a margin beside the picture.
      const rows = [...(legendEl?.querySelectorAll("span") ?? [])].map((row) => {
        const swatch = row.querySelector("i")
        const mark = row.querySelector("b")
        const glyph = mark?.textContent ?? ""
        return {
          colour: swatch ? swatch.style.backgroundColor : "",
          glyph,
          label: (row.textContent ?? "").slice(glyph.length).trim(),
        }
      })

      const fontPx = Math.max(11, Math.round(rendered.height / 48))
      const lineHeight = Math.round(fontPx * 2)
      const pad = Math.round(fontPx * 1.6)
      const panel = rows.length ? Math.round(rendered.width * 0.2) + pad : 0

      const out = document.createElement("canvas")
      out.width = rendered.width + panel
      out.height = rendered.height
      const ctx = out.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = computedStyleMap["--light"]
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(rendered, 0, 0)

      if (rows.length) {
        const left = rendered.width + pad
        let y = Math.round((rendered.height - rows.length * lineHeight) / 2) + lineHeight
        ctx.textBaseline = "middle"
        ctx.font = `${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`
        if ("letterSpacing" in ctx) (ctx as any).letterSpacing = `${(fontPx * 0.06).toFixed(1)}px`
        let previous = rows[0]?.colour !== ""
        for (const row of rows) {
          const isCluster = row.colour !== ""
          // The panel puts a rule where the relation marks end and the clusters begin; the
          // image keeps that break, because the two halves answer different questions.
          if (isCluster !== previous) {
            ctx.strokeStyle = computedStyleMap["--lightgray"]
            ctx.lineWidth = Math.max(1, Math.round(fontPx / 11))
            ctx.beginPath()
            ctx.moveTo(left, y - lineHeight * 0.55)
            ctx.lineTo(left + fontPx * 4, y - lineHeight * 0.55)
            ctx.stroke()
            previous = isCluster
          }
          if (isCluster) {
            ctx.fillStyle = row.colour
            ctx.beginPath()
            ctx.arc(left + fontPx * 0.4, y, fontPx * 0.34, 0, 2 * Math.PI)
            ctx.fill()
          } else {
            ctx.fillStyle = computedStyleMap["--darkgray"]
            ctx.fillText(row.glyph, left, y)
          }
          ctx.fillStyle = computedStyleMap["--darkgray"]
          ctx.fillText(row.label.toUpperCase(), left + fontPx * 1.3, y)
          y += lineHeight
        }
      }

      const link = document.createElement("a")
      link.href = out.toDataURL("image/png")
      link.download = `${data.get(slug)?.title ?? "graph"} — graph.png`
      link.click()
    } catch (_) {
      // nothing to be done for the reader here; the graph itself is unaffected
    }
  }

  shotButton?.addEventListener("click", saveGraphImage)

  readStoredControls()
  if (controlsEl) {
    syncControlInputs()
    applyControls(false)
    controlsEl.addEventListener("input", onControlInput)
    resetButton?.addEventListener("click", onControlReset)
  }

  return () => {
    stopAnimation = true
    sourceToggleEl?.removeEventListener("toggle", applyToggles)
    clusterToggleEl?.removeEventListener("toggle", applyToggles)
    backlinksToggleEl?.removeEventListener("toggle", applyToggles)
    controlsEl?.removeEventListener("input", onControlInput)
    resetButton?.removeEventListener("click", onControlReset)
    shotButton?.removeEventListener("click", saveGraphImage)
    app.destroy()
  }
}

let localGraphCleanups: (() => void)[] = []
let globalGraphCleanups: (() => void)[] = []

function cleanupLocalGraphs() {
  for (const cleanup of localGraphCleanups) {
    cleanup()
  }
  localGraphCleanups = []
}

function cleanupGlobalGraphs() {
  for (const cleanup of globalGraphCleanups) {
    cleanup()
  }
  globalGraphCleanups = []
}

let expandedGraphCleanups: (() => void)[] = []

function cleanupExpandedGraphs() {
  for (const cleanup of expandedGraphCleanups) {
    cleanup()
  }
  expandedGraphCleanups = []
}

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const slug = e.detail.url
  addToVisited(simplifySlug(slug))

  async function renderLocalGraph() {
    cleanupLocalGraphs()
    const localGraphContainers = document.getElementsByClassName("graph-container")
    for (const container of localGraphContainers) {
      localGraphCleanups.push(await renderGraph(container as HTMLElement, slug))
    }
  }

  await renderLocalGraph()
  const handleThemeChange = () => {
    void renderLocalGraph()
  }

  document.addEventListener("themechange", handleThemeChange)
  window.addCleanup(() => {
    document.removeEventListener("themechange", handleThemeChange)
  })

  const containers = [...document.getElementsByClassName("global-graph-outer")] as HTMLElement[]
  async function renderGlobalGraph() {
    // The button that shows the whole vault now shows the map of it. The force layout it
    // used to open said less about the same 261 terms than the twenty circles do.
    if (document.querySelector("#vault-map .vault-map-overlay")) {
      document.dispatchEvent(new CustomEvent("open-vault-map", { detail: {} }))
      return
    }
    const slug = getFullSlug(window)
    for (const container of containers) {
      container.classList.add("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = "1"
      }

      const graphContainer = container.querySelector(".global-graph-container") as HTMLElement
      registerEscapeHandler(container, hideGlobalGraph)
      if (graphContainer) {
        globalGraphCleanups.push(await renderGraph(graphContainer, slug))
      }
    }
  }

  function hideGlobalGraph() {
    cleanupGlobalGraphs()
    for (const container of containers) {
      container.classList.remove("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = ""
      }
    }
  }

  async function shortcutHandler(e: HTMLElementEventMap["keydown"]) {
    if (e.key === "g" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      const anyGlobalGraphOpen = containers.some((container) =>
        container.classList.contains("active"),
      )
      anyGlobalGraphOpen ? hideGlobalGraph() : renderGlobalGraph()
    }
  }

  // Loupe: the same local graph as in the sidebar, opened at full size. The toggles are
  // moved into the overlay rather than duplicated, so both views read the same state —
  // renderGraph finds them with closest(".graph"), which holds either way.
  const expandedContainers = [
    ...document.getElementsByClassName("expanded-graph-outer"),
  ] as HTMLElement[]

  async function renderExpandedGraph() {
    const slug = getFullSlug(window)
    for (const container of expandedContainers) {
      container.classList.add("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = "1"
      }

      const graphContainer = container.querySelector(".expanded-graph-container") as HTMLElement
      registerEscapeHandler(container, hideExpandedGraph)
      if (graphContainer) {
        // renderGraph empties its container, so anything still parked in there from a
        // previous open has to go home first or it is destroyed with the old canvas.
        returnTogglesHome(container)
        expandedGraphCleanups.push(await renderGraph(graphContainer, slug))
        const toggles = container.closest(".graph")?.querySelector(".graph-toggles")
        if (toggles) {
          graphContainer.appendChild(toggles)
        }
      }
    }
  }

  // The switches live in the sidebar and are lent to the overlay, so every route out of
  // the overlay has to give them back — including leaving the page by clicking a node in
  // the enlarged graph, which never passes through hideExpandedGraph at all.
  function returnTogglesHome(container: HTMLElement) {
    const toggles = container.querySelector(".graph-toggles")
    const home = container.closest(".graph")?.querySelector(".graph-outer")
    if (toggles && home) {
      home.appendChild(toggles)
    }
  }

  function hideExpandedGraph() {
    for (const container of expandedContainers) {
      returnTogglesHome(container)
      container.classList.remove("active")
      const sidebar = container.closest(".sidebar") as HTMLElement
      if (sidebar) {
        sidebar.style.zIndex = ""
      }
    }
    cleanupExpandedGraphs()
  }

  function toggleExpandedGraph() {
    const anyOpen = expandedContainers.some((container) => container.classList.contains("active"))
    anyOpen ? hideExpandedGraph() : void renderExpandedGraph()
  }

  const closeButtons = document.getElementsByClassName("graph-close")
  Array.from(closeButtons).forEach((button) => {
    button.addEventListener("click", hideExpandedGraph)
    window.addCleanup(() => button.removeEventListener("click", hideExpandedGraph))
  })

  const expandIcons = document.getElementsByClassName("expand-graph-icon")
  Array.from(expandIcons).forEach((icon) => {
    icon.addEventListener("click", toggleExpandedGraph)
    window.addCleanup(() => icon.removeEventListener("click", toggleExpandedGraph))
  })

  const containerIcons = document.getElementsByClassName("global-graph-icon")
  Array.from(containerIcons).forEach((icon) => {
    icon.addEventListener("click", renderGlobalGraph)
    window.addCleanup(() => icon.removeEventListener("click", renderGlobalGraph))
  })

  document.addEventListener("keydown", shortcutHandler)
  window.addCleanup(() => {
    document.removeEventListener("keydown", shortcutHandler)
    hideExpandedGraph()
    cleanupLocalGraphs()
    cleanupGlobalGraphs()
    cleanupExpandedGraphs()
  })
})
