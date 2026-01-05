Issues & Missing Elements

1. UX/Visual Design Issues
| Issue | Location | Severity |
|-------|----------|----------|
| Header is overcrowded - 7 controls crammed together | Lines 1325-1378 | High |
| No loading state feedback beyond typing dots | - | Medium |
| Inconsistent button styles - Clear Chat uses different pattern than New Chat | Lines 695-717 vs 105-141 | Low |
| Missing focus states for keyboard navigation | Throughout | Medium |
| No empty state illustration - just text | Lines 1416-1420 | Low |

2. Accessibility (A11y) Gaps
- No aria-label on icon-only buttons (sidebar toggle, send button)
- No role="main", role="navigation" landmarks
- No skip-to-content link
- Color contrast may fail WCAG on some elements (e.g., #71717a secondary text)
- No aria-live region for streaming messages
- Keyboard trap potential in modal-like sidebar on mobile

3. Mobile UX Problems
- Header controls stack awkwardly on small screens (multiple order rules fighting)
- Sidebar overlay doesn't trap focus
- No swipe gestures for sidebar
- Touch targets may be too small (some buttons 35px)

4. Code Quality Issues
- 2544 lines in a single HTML file - unmaintainable
- Duplicate CSS rules (e.g., #userInput::placeholder appears 3 times - lines 977, 981, 989)
- Orphaned CSS at bottom (lines 1270-1321 have rules outside media query)
- No CSS organization/methodology (BEM, etc.)
- Inline SVGs repeated throughout

5. Missing Standard Chat Features
- No message editing
- No message copying (copy button)
- No message regeneration
- No conversation search
- No export/import conversations
- No keyboard shortcuts help
- No markdown preview for user input
- No image/file upload UI (even if backend doesn't support it yet)

6. Performance Concerns
- All CSS/JS inline = no caching
- No lazy loading for conversation history
- No virtualization for long chats
- All conversations loaded at once from localStorage

---
Recommended Improvements

High Priority:
1. Simplify header - Move model selector, web search, theme into a settings panel/dropdown
2. Add accessibility attributes - aria-labels, landmarks, live regions
3. Fix duplicate/orphaned CSS - Lines 1270-1321 appear to be orphaned rules
4. Add copy button to assistant messages

Medium Priority:
5. Split into separate CSS/JS files for maintainability
6. Add conversation search
7. Implement keyboard shortcuts (/, Cmd+K, etc.)
8. Add proper focus management

Lower Priority:
9. Add empty state illustrations
10. Implement message regeneration
11. Add swipe gestures for mobile sidebar