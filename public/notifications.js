// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-icon">
        ${type === 'success' ? '✓' : type === 'warning' ? '!' : 'i'}
      </div>
      <div class="notification-message">${message}</div>
      <div class="notification-close">&times;</div>
    `;
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Закрытие по клику
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
    
    // Автозакрытие через 5 секунд
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }
  
  // Проверка flash-сообщений из сервера
  document.addEventListener('DOMContentLoaded', () => {
    const flashSuccess = document.querySelector('.flash-success');
    const flashError = document.querySelector('.flash-error');
    
    if (flashSuccess) {
      showNotification(flashSuccess.textContent, 'success');
      flashSuccess.remove();
    }
    
    if (flashError) {
      showNotification(flashError.textContent, 'warning');
      flashError.remove();
    }
  });
  
  // Функция для отправки напоминаний
  function sendReminders() {
    fetch('/api/events/reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.notifications.length > 0) {
        data.notifications.forEach(notification => {
          showNotification(notification.message, 'info');
        });
      }
    })
    .catch(error => console.error('Error:', error));
  }
  
  // Проверяем напоминания каждые 30 минут
  setInterval(sendReminders, 30 * 60 * 1000);
  
  // Первая проверка при загрузке страницы
  sendReminders();