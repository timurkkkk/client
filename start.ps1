fnm env --use-on-cd | Out-String | Invoke-Expression
Set-ExecutionPolicy RemoteSigned -Scope Process
npm start