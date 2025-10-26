// Popup script
document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');

  // Check if current tab is on the expense form page
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab && (
      currentTab.url.includes('worksmobile.com') || 
      currentTab.url.includes('naver.com') ||
      currentTab.url.includes('ncpworkplace.com')
    )) {
      statusDiv.className = 'status active';
      statusDiv.innerHTML = `
        <div class="status-icon">✅</div>
        <div>활성화됨!<br>페이지에서 "📊 CSV 업로드" 버튼을 사용하세요</div>
      `;
    }
  });
});
