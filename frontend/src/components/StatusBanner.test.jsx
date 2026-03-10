import { render, screen } from "@testing-library/react";
import StatusBanner from "./StatusBanner.jsx";

describe("StatusBanner", () => {
  it("renders nothing when message is missing", () => {
    const { container } = render(<StatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an error alert with title and message", () => {
    render(<StatusBanner type="error" title="Eroare" message="Plata a esuat." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Eroare");
    expect(screen.getByRole("alert")).toHaveTextContent("Plata a esuat.");
  });

  it("renders info messages as status banners", () => {
    render(<StatusBanner type="info" message="Cererea a fost trimisa." />);

    expect(screen.getByRole("status")).toHaveTextContent("Cererea a fost trimisa.");
  });
});
