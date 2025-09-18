; Clear user data on installation to prevent login session persistence
!macro customInstall
  ; Clear Electron app data
  RMDir /r "$APPDATA\quantmind-desktop"
  RMDir /r "$LOCALAPPDATA\quantmind-desktop"
  
  ; Clear any cached user data
  Delete "$APPDATA\quantmind-desktop\*.*"
  Delete "$LOCALAPPDATA\quantmind-desktop\*.*"
!macroend