import neutralIllustration from "../../assets/03-neutral.svg";
import "./NotFound.css";

export function NotFound() {
  return (
    <main className="not-found">
      <img className="not-found__illustration" src={neutralIllustration} alt="" />
      <p className="not-found__status">404</p>
      <h1 className="not-found__title">Esta página no existe</h1>
      <p className="not-found__message">
        Puede que el enlace esté incompleto o que la página haya cambiado de lugar.
      </p>
      <a className="not-found__link" href="/">
        Ir al cancionero
      </a>
    </main>
  );
}
