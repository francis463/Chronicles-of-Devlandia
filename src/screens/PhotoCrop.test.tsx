import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoCrop } from "./PhotoCrop";

const PHOTO = new File(["x"], "me.png", { type: "image/png" });

/** jsdom does not load pictures, so the size the browser would report is faked here. */
function size(w: number, h: number) {
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => w });
  Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", { configurable: true, get: () => h });
}

const setup = (w = 400, h = 200) => {
  size(w, h);
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<PhotoCrop file={PHOTO} onSave={onSave} onCancel={onCancel} />);
  const img = screen.getByAltText("Your picture");
  fireEvent.load(img);
  return { onSave, onCancel, img, user: userEvent.setup() };
};

describe("PhotoCrop", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:photo");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("opens as a dialog with the picture, a zoom slider and Save and Cancel", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "< CROP YOUR PHOTO >" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("1");
    expect(screen.getByRole("button", { name: "[ Save photo ]" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "[ Cancel ]" })).toBeInTheDocument();
  });

  it("saves the middle of the picture when nothing is moved", async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole("button", { name: "[ Save photo ]" }));
    expect(onSave).toHaveBeenCalledWith({ zoom: 1, cx: 200, cy: 100 });
  });

  it("the arrow keys move the picture under the frame, and stop at the edge", async () => {
    const { onSave, user } = setup();
    const frame = screen.getByRole("group", { name: /Crop area/ });
    frame.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "[ Save photo ]" }));
    // side 200, a step is 5% of it: 10 pixels each
    expect(onSave).toHaveBeenLastCalledWith({ zoom: 1, cx: 220, cy: 100 });
    frame.focus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    await user.click(screen.getByRole("button", { name: "[ Save photo ]" }));
    expect(onSave).toHaveBeenLastCalledWith({ zoom: 1, cx: 220, cy: 100 }); // a wide picture cannot move up or down at zoom 1
  });

  it("the slider and the + and - keys zoom, between 1 and 4", async () => {
    const { onSave, user } = setup();
    fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), { target: { value: "2" } });
    await user.click(screen.getByRole("button", { name: "[ Save photo ]" }));
    expect(onSave).toHaveBeenLastCalledWith({ zoom: 2, cx: 200, cy: 100 });
    screen.getByRole("group", { name: /Crop area/ }).focus();
    await user.keyboard("-----");
    await user.click(screen.getByRole("button", { name: "[ Save photo ]" }));
    expect(onSave).toHaveBeenLastCalledWith({ zoom: 1, cx: 200, cy: 100 });
    screen.getByRole("group", { name: /Crop area/ }).focus();
    await user.keyboard("++++++++++++");
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("4");
  });

  it("dragging the picture moves what is inside the frame", () => {
    const { onSave } = setup();
    const frame = screen.getByRole("group", { name: /Crop area/ });
    fireEvent.pointerDown(frame, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 70, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(frame, { pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "[ Save photo ]" }));
    // the frame is 240 px for a 200 px square, so 30 screen pixels are 25 picture pixels; dragging left shows more of the right
    expect(onSave).toHaveBeenCalledWith({ zoom: 1, cx: 225, cy: 100 });
  });

  it("Cancel and [X] CLOSE leave without saving", async () => {
    const { onSave, onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "[ Cancel ]" }));
    await user.click(screen.getByRole("button", { name: "[X] CLOSE" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Save waits until the picture has loaded, and says so when it cannot be read", () => {
    size(400, 200);
    render(<PhotoCrop file={PHOTO} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "[ Save photo ]" })).toBeDisabled();
    fireEvent.error(screen.getByAltText("Your picture"));
    expect(screen.getByRole("alert")).toHaveTextContent("Can't read that picture.");
    expect(screen.getByRole("button", { name: "[ Save photo ]" })).toBeDisabled();
  });

  it("gives the picture address back when it closes", () => {
    size(400, 200);
    const { unmount } = render(<PhotoCrop file={PHOTO} onSave={vi.fn()} onCancel={vi.fn()} />);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });
});
