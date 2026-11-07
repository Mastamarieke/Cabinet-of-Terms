import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { isWholeVaultPage } from "./quartz/components/VaultMap"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  // the red band with the name of the Cabinet and the title row (07-11-2026)
  afterBody: [Component.Masthead()],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    // the news band on the front page (14-09, switched on again 08-10 to be discussed); it
    // renders only on the front page, but its script also opens #news- links on every entry
    Component.Ticker(),
    Component.TagList(),
    Component.ConditionalRender({
      component: Component.Graph({ localGraph: { showTags: false }, globalGraph: { removeTags: ["source"] } }),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.GraphStory(),
    Component.AttentionChart(),
    Component.Outward(),
    Component.Voice(),
    Component.RelatedTerms(),
    Component.Citations(),
    Component.VaultMap(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      useSavedState: false,
    }),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],

}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    // Every page that is about one thing keeps its own graph: a cluster's About page, a term
    // in its own folder, a Sources/ overview. The folder root and the tag pages have no links
    // of their own, so their local graph was always an empty box; there the map is the picture.
    Component.ConditionalRender({
      component: Component.Graph({ localGraph: { depth: 1, scale: 0.9, showTags: false }, globalGraph: { removeTags: ["source"] } }),
      condition: (page) => !isWholeVaultPage(page.fileData.slug ?? ""),
    }),
    Component.GraphStory(),
    Component.AttentionChart(),
    Component.Outward(),
    Component.Voice(),
    Component.RelatedTerms(),
    Component.Citations(),
    Component.VaultMap({ showPanel: true }),
    Component.Ticker(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      useSavedState: false,
    }),
  ],
  right: [
    Component.Backlinks(),
  ],
}
