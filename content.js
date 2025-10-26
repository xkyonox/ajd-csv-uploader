// Main content script for Naver Works Expense CSV Uploader
(function() {
  'use strict';

  const UID = 'dbac6115-c99a-22ce-e4cf-d6e7577c55ac';
  const COLS = {
    date: '692ff17b-7726-d57a-c606-20ccc7647a79',
    item: 'd2e0d9f7-0dcc-c263-5111-7d1173c0964a',
    desc: '49784446-9f22-bd1e-5885-5a60284dbd89',
    place: '745bc3e7-d6d8-9fb4-d983-60ad8842f192',
    amt: 'a0a5a602-d78d-2c27-c0da-84d8c95b8b4a',
    note: '16562bc9-3e22-a3b7-db7a-8487c2522a25'
  };

  let currentData = null;
  let itemMaps = null;

  // Check if we're on the expense form page
  function isExpenseFormPage() {
    // Check by URL pattern first
    const url = window.location.href;
    if (url.includes('/user/write/fg-dfm/') || url.includes('fg-dfm')) {
      return true;
    }
    
    // Fallback: check by form element
    return document.querySelector('#id_fgcp_' + UID + '_tbody') !== null;
  }

  // Wait for page to be ready
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout waiting for element: ' + selector));
      }, timeout);
    });
  }

  // Build dropdown maps from form
  function buildItemMaps() {
    const tbody = document.querySelector('#id_fgcp_' + UID + '_tbody');
    const row = tbody?.querySelector('tr[name="tableRows"]');
    const box = row?.querySelector('#select_pc_option_' + COLS.item);
    
    if (!box) {
      throw new Error('드롭다운 옵션을 찾을 수 없습니다.');
    }

    const items = [...box.querySelectorAll('a.dropdown-item')]
      .filter(a => a.textContent.trim() !== '선택하세요.');
    
    const label2val = new Map(
      items.map(a => [a.textContent.trim(), a.getAttribute('value') || ''])
    );
    const num2val = new Map(
      items.map((a, i) => [i + 1, a.getAttribute('value') || ''])
    );
    const labels = items.map((a, i) => `${i + 1}:${a.textContent.trim()}`);

    return { label2val, num2val, labels };
  }

  // Create upload button
  function createUploadButton() {
    // Check if button already exists
    if (document.getElementById('nw-csv-upload-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'nw-csv-upload-btn';
    button.className = 'nw-csv-upload-btn';
    button.innerHTML = '📊 CSV 업로드';
    
    button.addEventListener('click', () => {
      showUploadDialog();
    });

    // Find a good place to insert the button
    const form = document.querySelector('#id_fgcp_' + UID + '_tbody');
    if (form && form.parentElement) {
      const container = document.createElement('div');
      container.style.cssText = 'margin: 10px 0; text-align: right;';
      container.appendChild(button);
      form.parentElement.insertBefore(container, form);
    }
  }

  // Show upload dialog
  function showUploadDialog() {
    const overlay = document.createElement('div');
    overlay.id = 'nw-csv-overlay';
    overlay.className = 'nw-csv-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'nw-csv-dialog';
    
    dialog.innerHTML = `
      <div class="nw-csv-header">
        <h2>📊 CSV 파일 업로드</h2>
        <button class="nw-csv-close" onclick="this.closest('.nw-csv-overlay').remove()">✕</button>
      </div>
      <div class="nw-csv-body">
        <div class="nw-csv-upload-area" id="nw-upload-area">
          <input type="file" id="nw-csv-input" accept=".csv,.txt" style="display: none;">
          <div class="nw-upload-placeholder">
            <div class="nw-upload-icon">📁</div>
            <p>CSV 파일을 드래그하거나 클릭하여 선택하세요</p>
            <small>지원 형식: .csv, .txt (탭 또는 쉼표 구분)</small>
          </div>
        </div>
        <div class="nw-csv-info">
          <h3>📋 CSV 형식 안내</h3>
          <p>다음 컬럼이 포함되어야 합니다:</p>
          <ul>
            <li><strong>사용 일자</strong> (예: 2025.09.15 또는 20250915)</li>
            <li><strong>사용 항목</strong> (예: 식대 또는 번호)</li>
            <li><strong>사용 내역(+목적)</strong></li>
            <li><strong>사용처</strong></li>
            <li><strong>사용금액</strong> (예: 50000 또는 50,000)</li>
            <li><strong>비고(참석자 등)</strong></li>
          </ul>
          <p class="nw-note">* 첫 행에 헤더가 없어도 자동으로 인식됩니다.</p>
        </div>
        <div id="nw-preview-container" style="display: none;">
          <h3>🔍 데이터 미리보기</h3>
          <div id="nw-preview-content"></div>
          <div id="nw-validation-result"></div>
          <div class="nw-button-group">
            <button id="nw-btn-cancel" class="nw-btn nw-btn-secondary">취소</button>
            <button id="nw-btn-import" class="nw-btn nw-btn-primary">입력 시작</button>
          </div>
        </div>
        <div id="nw-progress-container" style="display: none;">
          <h3>⏳ 데이터 입력 중...</h3>
          <div class="nw-progress-bar">
            <div id="nw-progress-fill" class="nw-progress-fill"></div>
          </div>
          <p id="nw-progress-text">0 / 0</p>
        </div>
        <div id="nw-result-container" style="display: none;">
          <h3 id="nw-result-title">✅ 완료!</h3>
          <div id="nw-result-content"></div>
          <button id="nw-btn-close" class="nw-btn nw-btn-primary">닫기</button>
        </div>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    setupUploadHandlers(overlay);
  }

  // Setup upload handlers
  function setupUploadHandlers(overlay) {
    const uploadArea = overlay.querySelector('#nw-upload-area');
    const fileInput = overlay.querySelector('#nw-csv-input');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('nw-drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('nw-drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('nw-drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file, overlay);
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileUpload(file, overlay);
    });
  }

  // Handle file upload
  async function handleFileUpload(file, overlay) {
    try {
      const text = await file.text();
      const parser = new CSVParser();
      const parsed = parser.parse(text);
      
      currentData = parsed;
      showPreview(parsed, overlay);
      
    } catch (error) {
      showError('파일 읽기 실패: ' + error.message, overlay);
    }
  }

  // Show preview
  function showPreview(data, overlay) {
    const uploadArea = overlay.querySelector('#nw-upload-area');
    const previewContainer = overlay.querySelector('#nw-preview-container');
    const previewContent = overlay.querySelector('#nw-preview-content');
    const validationResult = overlay.querySelector('#nw-validation-result');
    
    uploadArea.style.display = 'none';
    previewContainer.style.display = 'block';
    
    // Build preview table
    let html = '<div class="nw-preview-table-container"><table class="nw-preview-table"><thead><tr>';
    data.header.forEach(h => {
      html += `<th>${h}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Show first 5 rows
    const previewRows = data.data.slice(0, 5);
    previewRows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td>${cell || '<em>비어있음</em>'}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    if (data.data.length > 5) {
      html += `<p class="nw-preview-note">...외 ${data.data.length - 5}개 행</p>`;
    }
    
    previewContent.innerHTML = html;
    
    // Show validation results
    let validationHtml = '';
    if (!data.validation.isValid) {
      validationHtml += '<div class="nw-alert nw-alert-error"><strong>⚠️ 오류 발견:</strong><ul>';
      data.validation.errors.forEach(err => {
        validationHtml += `<li>${err}</li>`;
      });
      validationHtml += '</ul></div>';
    }
    
    if (data.validation.warnings.length > 0) {
      validationHtml += '<div class="nw-alert nw-alert-warning"><strong>⚠️ 경고:</strong><ul>';
      data.validation.warnings.forEach(warn => {
        validationHtml += `<li>${warn}</li>`;
      });
      validationHtml += '</ul></div>';
    }
    
    if (data.validation.isValid && data.validation.warnings.length === 0) {
      validationHtml = '<div class="nw-alert nw-alert-success">✅ 모든 데이터가 유효합니다!</div>';
    }
    
    validationResult.innerHTML = validationHtml;
    
    // Setup buttons
    overlay.querySelector('#nw-btn-cancel').onclick = () => {
      previewContainer.style.display = 'none';
      uploadArea.style.display = 'block';
      currentData = null;
    };
    
    overlay.querySelector('#nw-btn-import').onclick = () => {
      if (!data.validation.isValid) {
        if (!confirm('오류가 있지만 계속 진행하시겠습니까?')) {
          return;
        }
      }
      startImport(data, overlay);
    };
  }

  // Start import process
  async function startImport(data, overlay) {
    const previewContainer = overlay.querySelector('#nw-preview-container');
    const progressContainer = overlay.querySelector('#nw-progress-container');
    const progressFill = overlay.querySelector('#nw-progress-fill');
    const progressText = overlay.querySelector('#nw-progress-text');
    
    previewContainer.style.display = 'none';
    progressContainer.style.display = 'block';
    
    try {
      // Build item maps if not already done
      if (!itemMaps) {
        itemMaps = buildItemMaps();
      }
      
      const tbody = document.querySelector('#id_fgcp_' + UID + '_tbody');
      const addBtn = document.querySelector('#id_fgcp_' + UID + '_addBt');
      
      if (!tbody || !addBtn) {
        throw new Error('폼 요소를 찾을 수 없습니다.');
      }
      
      // Ensure enough rows
      let existingRows = tbody.querySelectorAll('tr[name="tableRows"]').length;
      while (existingRows < data.data.length) {
        addBtn.click();
        await sleep(100); // Give time for row to be added
        existingRows++;
      }
      
      // Inject data
      const trs = [...tbody.querySelectorAll('tr[name="tableRows"]')];
      const header = data.header;
      const rows = data.data;
      
      const failedRows = [];
      
      for (let i = 0; i < rows.length; i++) {
        const progress = ((i + 1) / rows.length * 100).toFixed(0);
        progressFill.style.width = progress + '%';
        progressText.textContent = `${i + 1} / ${rows.length}`;
        
        try {
          await injectRow(trs[i], rows[i], header);
          await sleep(50); // Small delay between rows
        } catch (error) {
          failedRows.push({ row: i + 1, error: error.message });
        }
      }
      
      // Trigger form calculations
      if (window.$fgCore) {
        if (window.$fgCore.doSubTotalCal) {
          window.$fgCore.doSubTotalCal(UID);
        }
        if (window.$fgCore['validation_' + UID]) {
          window.$fgCore['validation_' + UID]();
        }
      }
      
      showResult(rows.length, failedRows, overlay);
      
    } catch (error) {
      showError('입력 중 오류 발생: ' + error.message, overlay);
    }
  }

  // Inject single row
  async function injectRow(tr, rowData, header) {
    if (!tr) throw new Error('행을 찾을 수 없습니다');
    
    const H = (name) => header.indexOf(name);
    const norm = (s) => (s == null ? '' : String(s).trim());
    
    // Date - try multiple selectors
    const iDate = H('사용 일자');
    if (iDate >= 0 && rowData[iDate]) {
      const formattedDate = formatDate(rowData[iDate]);
      
      // Try multiple ways to find the date input
      // Method 1: By name attribute (original way)
      let dateInput = tr.querySelector(`input[name="fgcp_${UID}_datePicker"]`);
      
      // Method 2: By column ID
      if (!dateInput) {
        dateInput = tr.querySelector(`input[id*="${COLS.date}"]`);
      }
      
      // Method 3: By placeholder or label
      if (!dateInput) {
        dateInput = tr.querySelector(`input[type="text"][placeholder*="날짜"]`);
      }
      if (!dateInput) {
        dateInput = tr.querySelector(`input[type="text"][placeholder*="일자"]`);
      }
      
      // Method 4: All text inputs in row, pick the first one
      if (!dateInput) {
        const allInputs = tr.querySelectorAll(`input[type="text"]`);
        if (allInputs.length > 0) {
          dateInput = allInputs[0]; // First input is usually date
        }
      }
      
      if (dateInput) {
        console.log(`📅 날짜 필드 찾음:`, {
          name: dateInput.name,
          id: dateInput.id,
          placeholder: dateInput.placeholder,
          currentValue: dateInput.value,
          newValue: formattedDate
        });
        
        // Set value multiple ways to ensure it works
        dateInput.value = formattedDate;
        dateInput.setAttribute('value', formattedDate);
        
        // Trigger multiple events for different frameworks
        dateInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        dateInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
        dateInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
        
        // Wait a bit and verify
        await sleep(50);
        console.log(`📅 날짜 입력 후 값:`, dateInput.value);
        
        if (dateInput.value !== formattedDate) {
          console.warn(`⚠️ 날짜가 설정되지 않음! 다시 시도...`);
          // Try one more time with focus
          dateInput.focus();
          dateInput.value = formattedDate;
          dateInput.blur();
        }
      } else {
        console.error('❌ 날짜 입력 필드를 찾을 수 없습니다!');
        console.log('행 HTML:', tr.outerHTML.substring(0, 500));
      }
    }
    
    // Item dropdown
    const iItem = H('사용 항목');
    if (iItem >= 0 && rowData[iItem]) {
      const code = toItemCode(norm(rowData[iItem]));
      if (code) {
        clickComboInRow(tr, code);
      }
    }
    
    // Text inputs: desc, place, note
    const textInputs = tr.querySelectorAll(`input[name="fgcp_${UID}_text"]`);
    const iDesc = H('사용 내역(+목적)');
    const iPlace = H('사용처');
    
    // Try multiple possible note column names
    let iNote = H('비고(참석자 등 필요 기재사항)');
    if (iNote === -1) {
      iNote = H('비고(참석자 등)');
    }
    if (iNote === -1) {
      iNote = H('비고');
    }
    
    if (textInputs[0] && iDesc >= 0) {
      textInputs[0].value = norm(rowData[iDesc]);
      textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (textInputs[1] && iPlace >= 0) {
      textInputs[1].value = norm(rowData[iPlace]);
      textInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (textInputs[2] && iNote >= 0) {
      textInputs[2].value = norm(rowData[iNote]);
      textInputs[2].dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Amount
    const iAmt = H('사용금액');
    if (iAmt >= 0 && rowData[iAmt]) {
      const amtInput = tr.querySelector(`input[name="fgcp_${UID}_num"]`);
      if (amtInput) {
        amtInput.value = toAmount(rowData[iAmt]);
        amtInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // Helper functions
  function formatDate(s) {
    s = String(s).trim();
    if (!s) return '';
    
    const n = s.replace(/[-/]/g, '.').replace(/\s/g, '');
    let m = n.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    
    if (!m && /^\d{8}$/.test(n)) {
      m = [, n.slice(0, 4), n.slice(4, 6), n.slice(6, 8)];
    }
    
    if (m) {
      const [, y, mo, d] = m;
      return `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
    }
    
    return s;
  }

  function toAmount(v) {
    const cleaned = String(v).replace(/[,\s₩원KRW]/g, '').replace(/[^\d.-]/g, '');
    return String(Math.round(parseFloat(cleaned) || 0));
  }

  function toItemCode(raw) {
    if (/^\d+$/.test(raw)) {
      const n = parseInt(raw, 10);
      if (itemMaps.num2val.has(n)) {
        return itemMaps.num2val.get(n);
      }
    }
    
    if (itemMaps.label2val.has(raw)) {
      return itemMaps.label2val.get(raw);
    }
    
    // Try fuzzy match
    for (const [k, val] of itemMaps.label2val) {
      if (k.replace(/\s+/g, '') === raw.replace(/\s+/g, '')) {
        return val;
      }
    }
    
    console.warn('[사용 항목 매칭 실패]', raw);
    return '';
  }

  function clickComboInRow(tr, code) {
    const menu = tr.querySelector('#select_pc_option_' + COLS.item);
    if (!menu) return false;
    
    const a = [...menu.querySelectorAll('a.dropdown-item')]
      .find(x => (x.getAttribute('value') || '') === code);
    
    if (!a) return false;
    
    a.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
    
    return true;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Show result
  function showResult(total, failedRows, overlay) {
    const progressContainer = overlay.querySelector('#nw-progress-container');
    const resultContainer = overlay.querySelector('#nw-result-container');
    const resultTitle = overlay.querySelector('#nw-result-title');
    const resultContent = overlay.querySelector('#nw-result-content');
    
    progressContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    
    if (failedRows.length === 0) {
      resultTitle.textContent = '✅ 입력 완료!';
      resultContent.innerHTML = `
        <div class="nw-alert nw-alert-success">
          <p><strong>${total}개 행</strong>이 성공적으로 입력되었습니다.</p>
        </div>
      `;
    } else {
      resultTitle.textContent = '⚠️ 일부 완료';
      resultContent.innerHTML = `
        <div class="nw-alert nw-alert-warning">
          <p><strong>${total - failedRows.length}/${total}개 행</strong>이 입력되었습니다.</p>
          <p>다음 행에서 오류가 발생했습니다:</p>
          <ul>
            ${failedRows.map(f => `<li>${f.row}행: ${f.error}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    overlay.querySelector('#nw-btn-close').onclick = () => overlay.remove();
  }

  // Show error
  function showError(message, overlay) {
    const resultContainer = overlay.querySelector('#nw-result-container');
    const resultTitle = overlay.querySelector('#nw-result-title');
    const resultContent = overlay.querySelector('#nw-result-content');
    
    // Hide other containers
    overlay.querySelector('#nw-upload-area').style.display = 'none';
    overlay.querySelector('#nw-preview-container').style.display = 'none';
    overlay.querySelector('#nw-progress-container').style.display = 'none';
    
    resultContainer.style.display = 'block';
    resultTitle.textContent = '❌ 오류';
    resultContent.innerHTML = `
      <div class="nw-alert nw-alert-error">
        <p>${message}</p>
      </div>
    `;
    
    overlay.querySelector('#nw-btn-close').onclick = () => overlay.remove();
  }

  // Initialize
  async function init() {
    try {
      if (!isExpenseFormPage()) {
        console.log('📊 CSV Uploader: 경비 페이지가 아닙니다. 대기 중...');
        return;
      }
      
      console.log('📊 CSV Uploader: 경비 페이지 감지됨!');
      
      // Wait for form to be ready
      await waitForElement('#id_fgcp_' + UID + '_tbody');
      
      // Create upload button
      createUploadButton();
      
      console.log('✅ Naver Works CSV Uploader 준비 완료');
      
    } catch (error) {
      console.error('❌ Extension 초기화 실패:', error);
    }
  }

  // Run when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also watch for dynamic page changes (for SPA navigation)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('📊 CSV Uploader: URL 변경 감지:', currentUrl);
      setTimeout(init, 1000); // Wait a bit for page to load
    } else if (isExpenseFormPage() && !document.getElementById('nw-csv-upload-btn')) {
      init();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
