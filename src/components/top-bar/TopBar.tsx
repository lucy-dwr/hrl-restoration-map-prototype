import styles from './TopBar.module.css'

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
        <button type="button" className={styles.navLink} onClick={onAboutOpen}>
          About
        </button>
      </nav>
    </header>
  )
}
