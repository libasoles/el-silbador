// Mirrors src/editor/App.tsx's SongNotFound message: a missing slug and a private song owned by
// someone else are indistinguishable under RLS, so both share this one message rather than
// leaking which case applies.
export function SongNotFoundStatic() {
  return (
    <div className="song-not-found">
      <img className="song-not-found__mark" src="/03-neutral.svg" alt="" />
      <p className="empty-state">
        No encontramos esta canción. Puede que no exista, o que sea privada y solo la pueda ver
        quien la creó.
      </p>
      <a className="song-not-found__link" href="/">
        Ir al cancionero
      </a>
    </div>
  );
}
