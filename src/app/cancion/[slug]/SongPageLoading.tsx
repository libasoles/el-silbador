import styles from "./SongPageLoading.module.css";

/** Placeholder shown only while the browser restores the visitor's session after a hard reload.
 * A private song is invisible to the anonymous server request, so treating that temporary state
 * as a missing song would flash a false error to its owner. */
export function SongPageLoading() {
  return (
    <div className={styles.loading} role="status" aria-label="Cargando canción">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Cargando canción…</span>
    </div>
  );
}
