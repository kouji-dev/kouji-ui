---
"@kouji-ui/core": patch
---

fix(list-navigator): Space types a character in a text field instead of activating

`KjListNavigator` treated Space as "activate the highlighted item" wherever the
keydown came from — including the text input of a combobox or command palette.
Since a palette highlights a row for every query, typing a space ran that
command instead of reaching the input, so multi-word queries were impossible
(`commit graph` fired "Commit Changes" halfway through).

Space now falls through to the field whenever the event originates in text
entry (`<textarea>`, contenteditable, or a text-like `<input>`). Enter is still
the activation key from a text field, and Space keeps activating from
non-text-entry controls.
