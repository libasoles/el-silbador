import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../../test/matchMedia";
import { SongPerformers } from "./SongPerformers";

const data = vi.hoisted(() => ({ listArtistNames: vi.fn() }));
vi.mock("../../data", () => data);

const PERFORMERS = ["Tamara Castro", "Soledad"];

function renderFooter({
  performers = PERFORMERS,
  viewerIsAdmin,
  viewerOwnsSong,
  onChange = () => {},
}: {
  performers?: string[];
  viewerIsAdmin: boolean;
  viewerOwnsSong: boolean;
  onChange?: (performers: string[]) => void;
}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SongPerformers
        performers={performers}
        viewerIsAdmin={viewerIsAdmin}
        viewerOwnsSong={viewerOwnsSong}
        onChange={onChange}
      />
    </QueryClientProvider>,
  );
}

const performersInput = () => screen.queryByRole("combobox", { name: "Intérpretes" });

describe("SongPerformers", () => {
  beforeEach(() => {
    data.listArtistNames.mockResolvedValue(["Los Chalchaleros", "Soledad", "Tamara Castro"]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("suggests known performers to that admin as they type", async () => {
    mockMatchMedia(false);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderFooter({ performers: ["Soledad"], viewerIsAdmin: true, viewerOwnsSong: true, onChange });

    await user.type(performersInput()!, "chalcha");
    await user.click(await screen.findByRole("option", { name: "Los Chalchaleros" }));

    expect(onChange).toHaveBeenLastCalledWith(["Soledad", "Los Chalchaleros"]);
  });

  it("doesn't fetch the performers list for readers", () => {
    mockMatchMedia(false);
    renderFooter({ viewerIsAdmin: false, viewerOwnsSong: false });

    expect(data.listArtistNames).not.toHaveBeenCalled();
  });

  it("lets an admin who owns the song edit its performers on desktop", async () => {
    mockMatchMedia(false);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderFooter({ viewerIsAdmin: true, viewerOwnsSong: true, onChange });

    await user.type(performersInput()!, "Abel Pintos{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["Tamara Castro", "Soledad", "Abel Pintos"]);
    await user.click(screen.getByRole("button", { name: "Quitar Soledad" }));
    expect(onChange).toHaveBeenLastCalledWith(["Tamara Castro"]);
  });

  it("lets that admin add the first performer to a song with none", () => {
    mockMatchMedia(false);
    renderFooter({ performers: [], viewerIsAdmin: true, viewerOwnsSong: true });

    expect(performersInput()).toBeInTheDocument();
  });

  it("shows a non-admin owner only the legend", () => {
    mockMatchMedia(false);
    renderFooter({ viewerIsAdmin: false, viewerOwnsSong: true });

    expect(performersInput()).not.toBeInTheDocument();
    expect(screen.getByText("Interpretada por: Tamara Castro, Soledad")).toBeInTheDocument();
  });

  it("shows an admin only the legend on someone else's song", () => {
    mockMatchMedia(false);
    renderFooter({ viewerIsAdmin: true, viewerOwnsSong: false });

    expect(performersInput()).not.toBeInTheDocument();
    expect(screen.getByText("Interpretada por: Tamara Castro, Soledad")).toBeInTheDocument();
  });

  it("shows the owning admin only the legend on mobile", () => {
    mockMatchMedia(true);
    renderFooter({ viewerIsAdmin: true, viewerOwnsSong: true });

    expect(performersInput()).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar Soledad" })).not.toBeInTheDocument();
    expect(screen.getByText("Interpretada por: Tamara Castro, Soledad")).toBeInTheDocument();
  });

  it("shows nothing to a reader when the song has no performers", () => {
    mockMatchMedia(false);
    renderFooter({ performers: [], viewerIsAdmin: false, viewerOwnsSong: false });

    expect(screen.queryByText(/Interpretada por/)).not.toBeInTheDocument();
  });

  it("lists the performers in the order they were loaded", () => {
    mockMatchMedia(false);
    renderFooter({
      performers: ["Soledad", "Los Chalchaleros", "Tamara Castro"],
      viewerIsAdmin: false,
      viewerOwnsSong: false,
    });

    expect(
      screen.getByText("Interpretada por: Soledad, Los Chalchaleros, Tamara Castro"),
    ).toBeInTheDocument();
  });
});
