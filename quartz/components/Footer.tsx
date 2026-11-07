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
        {/* the project the Cabinet belongs to (29-10, Marieke: "logo in voettekst") */}
        <a class="footer-project" href="https://digitale-alertheid.nl/">
          <img
            class="logo-light"
            src={joinSegments(pathToRoot(fileData.slug!), "static/d-alert-logo.svg")}
            alt="D.Alert, Project Digitale Alertheid"
            width="148"
            height="32"
          />
          <img
            class="logo-dark"
            src={joinSegments(pathToRoot(fileData.slug!), "static/d-alert-logo-dark.svg")}
            alt=""
            width="148"
            height="32"
          />
          <span>Part of Project Digitale Alertheid</span>
        </a>
        {/* one fixed place for contact on every page (07-11-2026) */}
        <p class="footer-contact">
          Contact: <a href="mailto:info@digitale-alertheid.nl">info@digitale-alertheid.nl</a>
        </p>
        <p>
          {i18n(cfg.locale).components.footer.createdWith}{" "}
          <a href="https://quartz.jzhao.xyz/">Quartz v{version}</a> © {year}
        </p>
        <ul>
          {Object.entries(links).map(([text, link]) => (
            <li>
              <a href={link}>{text}</a>
            </li>
          ))}
        </ul>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
