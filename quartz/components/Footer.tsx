import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"
import { joinSegments, pathToRoot } from "../util/path"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg, fileData }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? []
    return (
      <footer class={`${displayClass ?? ""}`}>
        {/* two centred lines (08-11-2026, Marieke: "in een zin en gecentreerd"): the project and
            contact, then Quartz and its links */}
        <p class="footer-row footer-row-project">
          {/* the project the Cabinet belongs to (29-10, Marieke: "logo in voettekst") */}
          <a class="footer-project" href="https://digitale-alertheid.nl/">
            <img
              class="logo-light"
              src={joinSegments(pathToRoot(fileData.slug!), "static/dr-alert-logo.svg")}
              alt="Dr. Alert, Project Digital Alertness"
              width="166"
              height="32"
            />
            <img
              class="logo-dark"
              src={joinSegments(pathToRoot(fileData.slug!), "static/dr-alert-logo-dark.svg")}
              alt=""
              width="166"
              height="32"
            />
            <span>Part of Project Digital Alertness</span>
          </a>
          <span class="footer-sep">·</span>
          {/* one fixed place for contact on every page (07-11-2026) */}
          <span class="footer-contact">
            Contact: <a href="mailto:info@digitale-alertheid.nl">info@digitale-alertheid.nl</a>
          </span>
        </p>
        <p class="footer-row">
          {i18n(cfg.locale).components.footer.createdWith}{" "}
          <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
          {Object.entries(links).map(([text, link]) => (
            <>
              <span class="footer-sep">·</span>
              <a href={link}>{text}</a>
            </>
          ))}
        </p>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
