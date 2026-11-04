// @vitest-environment jsdom

import { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pickFromLibrary } from "./pick-attachments";
import { useThreadAttachments } from "./thread-attachments";

vi.mock("./i18n", () => ({
  t: (text: string) => text,
  useI18n: () => ({ t: (text: string) => text }),
}));
vi.mock("./pick-attachments", () => ({
  pickDocuments: vi.fn(),
  pickFromLibrary: vi.fn(),
  readDroppedFiles: vi.fn(),
  readSharedFiles: vi.fn(),
  takePhoto: vi.fn(),
}));
vi.mock("./use-file-drop", () => ({ useFileDrop: () => undefined }));
vi.mock("./incoming-share", () => ({
  isIncomingShareCurrent: () => false,
  retryIncomingShare: vi.fn(),
  takeIncomingShare: vi.fn(),
}));
vi.mock("./user-error", () => ({ errorText: (_: unknown, fallback: string) => fallback }));

let root: Root;
let attachments: ReturnType<typeof useThreadAttachments>;

function Probe({ botId }: { botId: string }) {
  attachments = useThreadAttachments({ botId, readOnly: false });
  return null;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  root = createRoot(document.createElement("div"));
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

it("keeps a picker error from the previous chat out of the next one", async () => {
  let fail!: (error: Error) => void;
  vi.mocked(pickFromLibrary).mockReturnValueOnce(
    new Promise((_, reject) => {
      fail = reject;
    }),
  );
  act(() => root.render(<Probe botId="bot-a" />));
  act(() => attachments.attachFrom("library"));
  act(() => root.render(<Probe botId="bot-b" />));

  await act(async () => fail(new Error("picker failed")));

  expect(attachments.attachmentNotice).toBeNull();
});

it("reports a picker error in the chat that opened it", async () => {
  vi.mocked(pickFromLibrary).mockRejectedValueOnce(new Error("picker failed"));
  act(() => root.render(<Probe botId="bot-a" />));

  await act(async () => attachments.attachFrom("library"));

  expect(attachments.attachmentNotice).toBe("Could not attach files");
});
