/**
 * Raises the global support chat widget (mounted in App via
 * SupportChatWidget). Help Centre / Contact Us dispatch this event; the
 * widget listens for it and opens itself.
 */
export function openSupportChat(): void {
  window.dispatchEvent(new CustomEvent('expedition:open-support-chat'))
}
