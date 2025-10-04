// Временный тестовый скрипт для проверки создания ВОР
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testVorCreation() {
  console.log('🔍 Тестирование создания ВОР...')

  // Сначала получим список проектов
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .limit(1)

  if (projectsError) {
    console.error('❌ Ошибка загрузки проектов:', projectsError)
    return
  }

  if (!projects || projects.length === 0) {
    console.error('❌ Нет проектов в БД')
    return
  }

  const testProject = projects[0]
  console.log('✅ Тестовый проект:', testProject)

  // Попробуем создать ВОР
  const vorData = {
    name: 'Тестовая ВОР для проверки project_id',
    project_id: testProject.id,
    rate_coefficient: 1.0
  }

  console.log('🔍 Создаем ВОР с данными:', vorData)

  const { data: createdVor, error: vorError } = await supabase
    .from('vor')
    .insert(vorData)
    .select('*')
    .single()

  if (vorError) {
    console.error('❌ Ошибка создания ВОР:', vorError)
    return
  }

  console.log('✅ ВОР успешно создана:', createdVor)

  // Проверим что ВОР действительно записалась в БД
  const { data: retrievedVor, error: retrieveError } = await supabase
    .from('vor')
    .select('*')
    .eq('id', createdVor.id)
    .single()

  if (retrieveError) {
    console.error('❌ Ошибка получения ВОР:', retrieveError)
    return
  }

  console.log('🔍 ВОР из БД:', retrievedVor)

  // Проверим project_id
  if (retrievedVor.project_id === testProject.id) {
    console.log('✅ project_id корректно записан в БД')
  } else {
    console.log('❌ project_id НЕ записан в БД:', {
      expected: testProject.id,
      actual: retrievedVor.project_id
    })
  }
}

// Запускаем тест
testVorCreation().catch(console.error)