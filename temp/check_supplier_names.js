// Проверка наличия данных в таблице supplier_names
// Этот файл поможет диагностировать проблему с загрузкой поставщиков

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfqgcaxmufzitdfafdlp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSupplierNames() {
  console.log('🔍 Проверяем таблицу supplier_names...')

  try {
    // 1. Проверяем общее количество записей
    const { count, error: countError } = await supabase
      .from('supplier_names')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Ошибка при подсчете записей:', countError)
      return
    }

    console.log(`📊 Общее количество записей в supplier_names: ${count}`)

    // 2. Если записи есть, показываем первые 10
    if (count > 0) {
      const { data, error } = await supabase
        .from('supplier_names')
        .select('id, name')
        .limit(10)

      if (error) {
        console.error('❌ Ошибка при загрузке данных:', error)
        return
      }

      console.log('📋 Первые 10 записей:')
      data.forEach((supplier, index) => {
        console.log(`${index + 1}. ID: ${supplier.id}, Name: "${supplier.name}"`)
      })
    } else {
      console.log('⚠️ Таблица supplier_names пуста!')
    }

    // 3. Проверяем таблицу nomenclature
    const { count: nomenclatureCount, error: nomenclatureError } = await supabase
      .from('nomenclature')
      .select('*', { count: 'exact', head: true })

    if (nomenclatureError) {
      console.error('❌ Ошибка при подсчете nomenclature:', nomenclatureError)
      return
    }

    console.log(`📊 Общее количество записей в nomenclature: ${nomenclatureCount}`)

    // 4. Проверяем связи nomenclature_supplier_mapping
    const { count: mappingCount, error: mappingError } = await supabase
      .from('nomenclature_supplier_mapping')
      .select('*', { count: 'exact', head: true })

    if (mappingError) {
      console.error('❌ Ошибка при подсчете mapping:', mappingError)
      return
    }

    console.log(`📊 Общее количество связей nomenclature_supplier_mapping: ${mappingCount}`)

  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error)
  }
}

checkSupplierNames()