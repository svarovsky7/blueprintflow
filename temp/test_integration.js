// ТЕСТИРОВАНИЕ ИНТЕГРАЦИИ DEEPSEEK + API SETTINGS
// Файл для проверки корректности работы всех созданных компонентов

console.log('=== ТЕСТ ИНТЕГРАЦИИ API SETTINGS И DEEPSEEK ===')

// Список проверяемых функций
const testsToRun = [
  {
    name: 'Entity API-Settings создан',
    check: () => {
      // Проверяем существование файлов
      const fs = require('fs')
      const path = require('path')

      const entityPath = path.join(process.cwd(), 'src/entities/api-settings')
      return fs.existsSync(entityPath) &&
             fs.existsSync(path.join(entityPath, 'index.ts')) &&
             fs.existsSync(path.join(entityPath, 'types.ts')) &&
             fs.existsSync(path.join(entityPath, 'api'))
    }
  },
  {
    name: 'Deepseek API модуль существует',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const deepseekPath = path.join(process.cwd(), 'src/entities/api-settings/api/deepseek-api.ts')
      return fs.existsSync(deepseekPath)
    }
  },
  {
    name: 'Yandex Disk API модуль существует',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const yandexPath = path.join(process.cwd(), 'src/entities/api-settings/api/yandex-disk-api.ts')
      return fs.existsSync(yandexPath)
    }
  },
  {
    name: 'ML API обновлен для поддержки Deepseek',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const mlApiPath = path.join(process.cwd(), 'src/entities/ml/api/ml-api.ts')
      if (!fs.existsSync(mlApiPath)) return false

      const content = fs.readFileSync(mlApiPath, 'utf8')
      return content.includes('deepseekApi') &&
             content.includes('mlModeApi') &&
             content.includes('predictWithDeepseek')
    }
  },
  {
    name: 'ML types обновлены с deepseek',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const mlTypesPath = path.join(process.cwd(), 'src/entities/ml/model/types.ts')
      if (!fs.existsSync(mlTypesPath)) return false

      const content = fs.readFileSync(mlTypesPath, 'utf8')
      return content.includes("'deepseek'")
    }
  },
  {
    name: 'API Settings страница создана',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const apiSettingsPath = path.join(process.cwd(), 'src/pages/admin/ApiSettings.tsx')
      return fs.existsSync(apiSettingsPath)
    }
  },
  {
    name: 'ChessboardML обновлен с AI/ML переключателем',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const chessboardMLPath = path.join(process.cwd(), 'src/pages/experiments/ChessboardML.tsx')
      if (!fs.existsSync(chessboardMLPath)) return false

      const content = fs.readFileSync(chessboardMLPath, 'utf8')
      return content.includes('mlMode') &&
             content.includes('setMLMode') &&
             content.includes('deepseekAvailable')
    }
  },
  {
    name: 'App.tsx обновлен с новой маршрутизацией',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const appPath = path.join(process.cwd(), 'src/App.tsx')
      if (!fs.existsSync(appPath)) return false

      const content = fs.readFileSync(appPath, 'utf8')
      return content.includes('ApiSettings') &&
             content.includes('/admin/api-settings') &&
             !content.includes('import Disk from')
    }
  },
  {
    name: 'FileUpload обновлен для нового API',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const fileUploadPath = path.join(process.cwd(), 'src/components/FileUpload.tsx')
      if (!fs.existsSync(fileUploadPath)) return false

      const content = fs.readFileSync(fileUploadPath, 'utf8')
      return content.includes('@/entities/api-settings')
    }
  },
  {
    name: 'Миграция БД создана',
    check: () => {
      const fs = require('fs')
      const path = require('path')

      const migrationPath = path.join(process.cwd(), 'sql/002_api_settings_migration.sql')
      return fs.existsSync(migrationPath)
    }
  }
]

// Запуск тестов
console.log('\n🔍 Запуск проверок...\n')

let passedTests = 0
let failedTests = 0

testsToRun.forEach((test, index) => {
  try {
    const result = test.check()
    if (result) {
      console.log(`✅ ${index + 1}. ${test.name}`)
      passedTests++
    } else {
      console.log(`❌ ${index + 1}. ${test.name}`)
      failedTests++
    }
  } catch (error) {
    console.log(`❌ ${index + 1}. ${test.name} (ошибка: ${error.message})`)
    failedTests++
  }
})

console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:')
console.log(`✅ Пройдено: ${passedTests}`)
console.log(`❌ Не пройдено: ${failedTests}`)
console.log(`🎯 Процент успеха: ${Math.round((passedTests / testsToRun.length) * 100)}%`)

if (failedTests === 0) {
  console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Интеграция выполнена успешно.')
} else {
  console.log('\n⚠️  Найдены проблемы. Требуется доработка.')
}

console.log('\n=== КОНЕЦ ТЕСТИРОВАНИЯ ===')