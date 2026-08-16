# Сборка, подпись и выпуск

## Подготовка

1. Работайте в `release/<version>` с чистым Git-деревом.
2. Обновите версии в `package.json` и `package-lock.json`.
3. Обновите README, аудит и changelog.
4. Выполните `npm ci` и `npm run release:check`.

`@yao-pkg/pkg` создаёт Windows x64 Enhanced SEA с Node.js 24 и ресурсами `public`:

```powershell
npm run build:win
npm run smoke:exe
```

Результаты: `dist/DOS95.exe` и `dist/DOS95.exe.sha256`. EXE работает без установленного Node.js.

## Подпись

Установите Windows SDK Signing Tools и импортируйте доверенный Code Signing сертификат с закрытым ключом в `Cert:\CurrentUser\My`. Самоподписанный сертификат подходит только для внутренних тестовых компьютеров.

```powershell
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert |
    Format-List Subject,Thumbprint,NotAfter

.\scripts\sign-exe.ps1 `
    -Thumbprint '<ОТПЕЧАТОК>' `
    -TimestampUrl '<RFC3161 URL ПОСТАВЩИКА СЕРТИФИКАТА>'
```

Сценарий находит x64 SignTool, проверяет сертификат/закрытый ключ/срок действия, подписывает SHA-256, добавляет timestamp, проверяет Authenticode и пересчитывает checksum. PFX и пароль в командную строку или Git не передаются.

Подписывайте после последней сборки и перед публикацией. Любое изменение EXE аннулирует подпись и checksum.

## Release gates

- lint, unit/integration, coverage и E2E успешны;
- `npm audit` не содержит известных уязвимостей;
- smoke EXE проходит с `PATH` без Node.js;
- secret scan и `git diff --check` чисты;
- SHA-256 соответствует EXE;
- production EXE имеет валидную trusted signature и timestamp либо явно помечен как unsigned preview;
- `.env`, PFX, VFS и legacy ZIP отсутствуют в Git/release source archive.

После проверки отправьте ветку:

```powershell
git push -u origin release/1.1.0
```

Тег и GitHub Release создаются отдельным решением после review ветки.
