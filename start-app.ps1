# start-app.ps1
Start-Process powershell -ArgumentList "cd `"$PWD`"; npx react-native start --reset-cache"
# In this same window, run:
# npx react-native run-android
