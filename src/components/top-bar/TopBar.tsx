import { useState, useRef, useEffect } from 'react'
import styles from './TopBar.module.css'

function DownloadMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className={styles.downloadWrapper}>
      <button
        type="button"
        className={styles.navLink}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Download data
      </button>
      {open && (
        <div className={styles.downloadMenu} role="menu">
          <a
            href="data/hrl_restoration_projects.geojson"
            download="hrl_restoration_projects.geojson"
            className={styles.downloadItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className={styles.downloadFormat}>GeoJSON</span>
            <span className={styles.downloadDesc}>For web mapping and scripting</span>
          </a>
          <a
            href="data/hrl_restoration_projects.gpkg"
            download="hrl_restoration_projects.gpkg"
            className={styles.downloadItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className={styles.downloadFormat}>GeoPackage</span>
            <span className={styles.downloadDesc}>For QGIS, ArcGIS, and other GIS tools</span>
          </a>
          <a
            href="data/hrl_restoration_projects.csv"
            download="hrl_restoration_projects.csv"
            className={styles.downloadItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className={styles.downloadFormat}>CSV</span>
            <span className={styles.downloadDesc}>Attributes only, no spatial data</span>
          </a>
        </div>
      )}
    </div>
  )
}

interface TopBarProps {
  onAboutOpen: () => void
}

export function TopBar({ onAboutOpen }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Healthy Rivers and Landscapes Restoration Dashboard</span>
      </div>
      <nav className={styles.nav}>
        <DownloadMenu />
        <button type="button" className={styles.navLink} onClick={onAboutOpen}>
          About
        </button>
      </nav>
    </header>
  )
}
