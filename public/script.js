const today = new Date();
const maxDate = new Date(today);
maxDate.setDate(today.getDate() - 1);

const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];

function isValidDateFormat(dateStr) {
    return dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function validateDate(input) {
    const dateStr = input.value;
    const errorDiv = document.getElementById(`${input.id}-error`);
    if (!errorDiv) {
        console.error(`Error div not found for ${input.id}`);
        return;
    }

    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    if (!isValidDateFormat(dateStr)) {
        errorDiv.textContent = `${input.id === 'recallDate1' ? 'Day 1' : 'Day 2'} date is invalid.`;
        errorDiv.style.display = 'block';
        input.value = '';
        if (input.id === 'recallDate1') updateDay2Lock();
        return;
    }

    const selectedDate = new Date(dateStr + 'T00:00:00Z');
    const maxDateCopy = new Date(maxDate.toISOString().split('T')[0] + 'T00:00:00Z');

    if (input.id === 'recallDate1') {
        if (isNaN(selectedDate.getTime()) || selectedDate > maxDateCopy) {
            errorDiv.textContent = 'Day 1 date cannot be today, in the future, or invalid.';
            errorDiv.style.display = 'block';
            input.value = '';
            updateDay2Lock();
            return;
        }

        const recallDate2 = document.getElementById('recallDate2').value;
        if (recallDate2 && isValidDateFormat(recallDate2)) {
            const day2Date = new Date(recallDate2 + 'T00:00:00Z');
            const diffDays = (day2Date - selectedDate) / (1000 * 60 * 60 * 24);
            if (diffDays <= 1) {
                errorDiv.textContent = 'Day 1 date must be at least 2 days before Day 2 date.';
                errorDiv.style.display = 'block';
                input.value = '';
                updateDay2Lock();
                return;
            }
            if (diffDays < 0) {
                errorDiv.textContent = 'Day 1 date cannot be after Day 2 date.';
                errorDiv.style.display = 'block';
                input.value = '';
                updateDay2Lock();
                return;
            }
        }

        updateDay2Lock();
    } else if (input.id === 'recallDate2') {
        const recallDate1 = document.getElementById('recallDate1').value;
        if (!recallDate1) {
            errorDiv.textContent = 'Please select Day 1 date first.';
            errorDiv.style.display = 'block';
            input.value = '';
            return;
        }
        const day1Date = new Date(recallDate1 + 'T00:00:00Z');
        const diffDays = (selectedDate - day1Date) / (1000 * 60 * 60 * 24);
        if (isNaN(selectedDate.getTime()) || selectedDate > maxDateCopy) {
            errorDiv.textContent = 'Day 2 date cannot be today, in the future, or invalid.';
            errorDiv.style.display = 'block';
            input.value = '';
        } else if (diffDays <= 1) {
            errorDiv.textContent = 'Day 2 date must be at least two days after Day 1.';
            errorDiv.style.display = 'block';
            input.value = '';
        } else if (diffDays < 0) {
            errorDiv.textContent = 'Day 2 date cannot be before Day 1.';
            errorDiv.style.display = 'block';
            input.value = '';
        }
    }
}

function updateDay2Lock() {
    const recallDate1Input = document.getElementById('recallDate1');
    const recallDate1 = recallDate1Input?.value;
    const earliestDateSpan = document.getElementById('earliestDate');
    const day2Section = document.querySelector('.survey-section[data-section="meal-recall-day2"]');
    const day2LockedMessage = document.getElementById('day2-locked-message');
    const day1MessageDiv = document.getElementById('save-message-meal-recall');
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    const savedSections = savedData.savedSections || {};

    if (!day2Section || !day2LockedMessage || !day1MessageDiv || !earliestDateSpan) {
        console.error('Required elements missing:', { day2Section, day2LockedMessage, day1MessageDiv, earliestDateSpan });
        return;
    }

    if (savedSections['meal-recall-day2']) {
        day2Section.classList.remove('blurred');
        day2LockedMessage.style.display = 'none';
        day1MessageDiv.classList.remove('comeback-message');
        day1MessageDiv.classList.add('save-message');
        day1MessageDiv.textContent = '';
        day1MessageDiv.style.display = 'none';
        return;
    }

    if (!recallDate1 || !isValidDateFormat(recallDate1)) {
        day1MessageDiv.classList.remove('comeback-message');
        day1MessageDiv.classList.add('save-message');
        day1MessageDiv.textContent = '';
        day1MessageDiv.style.display = 'none';
        day2LockedMessage.style.display = 'block';
        day2Section.classList.add('blurred');
        earliestDateSpan.textContent = 'a later date';
        return;
    }

    const day1Date = new Date(recallDate1 + 'T00:00:00Z');
    const maxDateCopy = new Date(maxDate.toISOString().split('T')[0] + 'T00:00:00Z');
    if (isNaN(day1Date.getTime()) || day1Date > maxDateCopy) {
        day1MessageDiv.classList.remove('comeback-message');
        day1MessageDiv.classList.add('save-message');
        day1MessageDiv.textContent = '';
        day1MessageDiv.style.display = 'none';
        day2LockedMessage.style.display = 'block';
        day2Section.classList.add('blurred');
        earliestDateSpan.textContent = 'a later date';
        if (recallDate1Input) recallDate1Input.value = '';
        console.warn('Invalid Day 1 date, resetting:', recallDate1);
        return;
    }

    const earliestDay2Date = new Date(day1Date);
    earliestDay2Date.setDate(day1Date.getDate() + 2);
    const comeBackDate = new Date(day1Date);
    comeBackDate.setDate(day1Date.getDate() + 3);

    earliestDateSpan.textContent = earliestDay2Date.toISOString().split('T')[0];

    const todayDate = new Date(today.toISOString().split('T')[0] + 'T00:00:00Z');
    if (todayDate >= comeBackDate && savedSections['meal-recall']) {
        day2Section.classList.remove('blurred');
        day2LockedMessage.style.display = 'none';
        day1MessageDiv.classList.remove('comeback-message');
        day1MessageDiv.classList.add('save-message');
        day1MessageDiv.textContent = '';
        day1MessageDiv.style.display = 'none';
    } else {
        day2Section.classList.add('blurred');
        day2LockedMessage.style.display = 'block';
        day1MessageDiv.classList.remove('save-message');
        day1MessageDiv.classList.add('comeback-message');
        day1MessageDiv.textContent = `Please come back on ${comeBackDate.toISOString().split('T')[0]} to fill the data of ${earliestDay2Date.toISOString().split('T')[0]}.`;
        day1MessageDiv.style.display = 'block';
    }
}

function updateUniqueLink(uuid, sessionId) {
    const uniqueLink = document.getElementById('uniqueLink');
    if (uniqueLink) {
        uniqueLink.href = `${window.location.origin}${window.location.pathname}?uuid=${uuid}${sessionId ? `&session_id=${sessionId}` : ''}`;
        uniqueLink.textContent = uniqueLink.href;
        uniqueLink.style.display = 'block';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function addMealRow(day, mealTime, tableBody, index = null, itemValue = '', quantityValue = '0', unitValue = 'cups') {
    const row = tableBody.insertRow(index !== null ? index : -1);
    const rowIndex = tableBody.rows.length - 1;
    row.setAttribute('data-row-index', rowIndex);
    row.innerHTML = `
        <td><input type="text" name="item${day}_${mealTime}[]" value="${itemValue}"></td>
        <td><input type="number" name="quantity${day}_${mealTime}[]" step="0.1" min="0" value="${quantityValue}"></td>
        <td>
            <select name="unit${day}_${mealTime}[]">
                <option value="cups" ${unitValue === 'cups' ? 'selected' : ''}>Cup(s)</option>
                <option value="tablespoons" ${unitValue === 'tablespoons' ? 'selected' : ''}>Tablespoon(s)</option>
                <option value="teaspoons" ${unitValue === 'teaspoons' ? 'selected' : ''}>Teaspoon(s)</option>
                <option value="pieces" ${unitValue === 'pieces' ? 'selected' : ''}>Piece(s)</option>
                <option value="small_glass" ${unitValue === 'small_glass' ? 'selected' : ''}>Small glass(es)</option>
            </select>
        </td>
        <td>
            <button type="button" class="add-row-action-btn" data-action="add">+</button>
            <button type="button" class="remove-row-action-btn" data-action="remove">–</button>
        </td>
    `;
    updateAddButtonVisibility(day, mealTime);
}

function removeMealRow(day, mealTime, row) {
    const tableBody = row.closest('tbody');
    const rowIndex = Array.from(tableBody.rows).indexOf(row);
    if (rowIndex >= 0) {
        tableBody.deleteRow(rowIndex);
        Array.from(tableBody.rows).forEach((r, i) => r.setAttribute('data-row-index', i));
        updateAddButtonVisibility(day, mealTime);
    } else {
        console.error(`Cannot delete row: Invalid index for ${mealTime}, Day ${day}`);
    }
}

function updateAddButtonVisibility(day, mealTime) {
    const tableBody = document.getElementById(`mealRecallTableDay${day}_${mealTime}`)?.getElementsByTagName('tbody')[0];
    const addButton = document.querySelector(`button.add-row-btn[data-day="${day}"][data-meal-time="${mealTime}"]`);
    if (tableBody && addButton) {
        addButton.style.display = tableBody.rows.length === 0 ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let uuid = getCookie('uuid') || localStorage.getItem('uuid');
    let sessionId = localStorage.getItem('sessionId');
    const urlParams = new URLSearchParams(window.location.search);
    const urlUuid = urlParams.get('uuid');
    const urlSessionId = urlParams.get('session_id');
    if (urlUuid) uuid = urlUuid;
    if (urlSessionId) sessionId = urlSessionId;
    if (!uuid) uuid = uuidv4();
    setCookie('uuid', uuid, 30);
    localStorage.setItem('uuid', uuid);
    if (sessionId) localStorage.setItem('sessionId', sessionId);

    const uuidText = document.getElementById('uuidText');
    const uniqueLink = document.getElementById('uniqueLink');
    if (uuidText && uniqueLink) {
        uuidText.textContent = uuid;
        uuidText.style.display = 'block';
        updateUniqueLink(uuid, sessionId);
    } else {
        console.error('Unique link or ID element missing:', { uuidText, uniqueLink });
    }

    checkFirstThree();

    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (radio.checked && radio.getAttribute('onchange')) {
            toggleQuestion(radio, radio.getAttribute('onchange').split("'")[1]);
        }
    });

    const minDate = new Date(today);
    minDate.setDate(today.getDate() - 30);
    const dateInputs = [document.getElementById('recallDate1'), document.getElementById('recallDate2')];
    dateInputs.forEach(input => {
        if (input) {
            input.setAttribute('max', maxDate.toISOString().split('T')[0]);
            input.setAttribute('min', minDate.toISOString().split('T')[0]);
            input.addEventListener('change', () => validateDate(input));
        }
    });

    [1, 2].forEach(day => {
        mealTimes.forEach(mealTime => {
            const tableId = `mealRecallTableDay${day}_${mealTime}`;
            const tableBody = document.getElementById(tableId)?.getElementsByTagName('tbody')[0];
            if (!tableBody) {
                console.error(`Table body not found for ID: ${tableId}`);
                return;
            }

            const addButton = document.querySelector(`button.add-row-btn[data-day="${day}"][data-meal-time="${mealTime}"]`);
            if (addButton) {
                addButton.addEventListener('click', () => {
                    addMealRow(day, mealTime, tableBody);
                });
            }

            tableBody.addEventListener('click', (event) => {
                const target = event.target;
                const row = target.closest('tr');
                if (!row) return;
                if (target.classList.contains('add-row-action-btn')) {
                    const index = parseInt(row.getAttribute('data-row-index')) + 1;
                    addMealRow(day, mealTime, tableBody, index);
                } else if (target.classList.contains('remove-row-action-btn')) {
                    removeMealRow(day, mealTime, row);
                }
            });

            updateAddButtonVisibility(day, mealTime);
        });
    });

    const calcBMIBtn = document.getElementById('calcBMIBtn');
    if (calcBMIBtn) {
        calcBMIBtn.addEventListener('click', (event) => {
            event.preventDefault();
            calculateBMI();
        });
    }

    document.querySelectorAll('.next-btn').forEach(button => {
        button.addEventListener('click', debounce(async (event) => {
            event.preventDefault();
            const section = button.getAttribute('data-section');
            await saveSection(uuid, section);
        }, 300));
    });

    const topTwoGroups = [
        "cereal_milled", "cereal_whole", "pulses", "green_leafy", "other_veg",
        "roots_tubers", "fruits", "nuts_seeds", "milk_products", "meat_products",
        "sugary_bev", "confectionery", "fried_foods"
    ];
    topTwoGroups.forEach(group => setupTopTwoDropdowns(group));

    enforceSingleSelectionPerRow();

    loadData(uuid, sessionId).then(() => {
        initializeSectionLocking(uuid);
        updateDay2Lock();
    });
});

function toggleQuestion(radio, targetId) {
    const show = radio.value === "yes";
    const idsToToggle = ["activity_type_group", "duration_group", "frequency_group"];
    idsToToggle.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? "block" : "none";
    });
}

function setupTopTwoDropdowns(groupName) {
    const highest = document.querySelector(`select[name="${groupName}_highest"]`);
    const second = document.querySelector(`select[name="${groupName}_second"]`);
    if (highest && second) {
        highest.addEventListener('change', () => {
            const selected = highest.value;
            Array.from(second.options).forEach(option => {
                option.disabled = option.value && option.value !== 'none' && option.value === selected;
            });
        });
        second.addEventListener('change', () => {
            const selected = second.value;
            Array.from(highest.options).forEach(option => {
                option.disabled = option.value && option.value !== 'none' && option.value === selected;
            });
        });
    }
}

function enforceSingleSelectionPerRow() {
    const table = document.querySelector("section[data-section='frequency'] table");
    if (!table) {
        console.error("Food Frequency table not found");
        return;
    }

    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row, rowIndex) => {
        const inputs = row.querySelectorAll("input[type='radio']");
        inputs.forEach(cb => {
            cb.addEventListener('change', function() {
                const rowRadios = row.querySelectorAll(`input[name="${this.name}"]`);
                rowRadios.forEach(r => {
                    if (r !== this) r.checked = false;
                });
            });
        });
    });
}

function checkFirstThree() {
    const myplateYes = document.querySelector('input[name="myplate"]:checked')?.value === 'yes';
    const foodpyramidYes = document.querySelector('input[name="foodpyramid"]:checked')?.value === 'yes';
    const dietaryguidelinesYes = document.querySelector('input[name="dietaryguidelines"]:checked')?.value === 'yes';
    const learnSourceGroup = document.getElementById('learn_source_group');
    if (learnSourceGroup) {
        learnSourceGroup.style.display = (myplateYes || foodpyramidYes || dietaryguidelinesYes) ? 'block' : 'none';
    }
}

function calculateBMI() {
    const weightInput = document.getElementById('weight');
    const heightInput = document.getElementById('height');
    const bmiInput = document.getElementById('bmi');
    if (!weightInput || !heightInput || !bmiInput) return;
    const weight = parseFloat(weightInput.value);
    const height = parseFloat(heightInput.value) / 100;
    if (weight > 0 && height > 0) {
        const bmi = weight / (height * height);
        bmiInput.value = bmi.toFixed(2);
    } else {
        bmiInput.value = '';
        alert('Please enter valid weight and height.');
    }
}

function sectionToTitle(section) {
    const titles = {
        'demographic': 'Demographic Information',
        'anthropometry': 'Anthropometry',
        'dietary': 'Dietary Assessment',
        'physical': 'Physical Activity',
        'frequency': 'Food Frequency Questionnaire',
        'food-items': 'List of Food Items',
        'unit-reference': 'Unit Reference Images',
        'meal-recall': '24-Hour Meal Recall - Day 1',
        'meal-recall-day2': '24-Hour Meal Recall - Day 2'
    };
    return titles[section] || section;
}

async function saveSection(uuid, section) {
    const formData = collectFormData(uuid);
    if (!formData) {
        alert('No data to save for this section.');
        return;
    }

    const sessionId = localStorage.getItem('sessionId');
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    savedData.savedSections = savedData.savedSections || {};

    if (section === 'demographic') {
        const age = parseFloat(formData.submissions.age);
        if (isNaN(age) || age < 0 || age > 120) {
            alert('Please enter a valid age between 0 and 120.');
            return;
        }
    }

    if (section === 'meal-recall' || section === 'meal-recall-day2') {
        const recallDate1 = formData.meal_items.recall1[0];
        if (!recallDate1 || !isValidDateFormat(recallDate1)) {
            alert('A valid Day 1 date is required.');
            return;
        }
        const day1Date = new Date(recallDate1 + 'T00:00:00Z');
        const maxDateCopy = new Date(maxDate.toISOString().split('T')[0] + 'T00:00:00Z');
        if (isNaN(day1Date.getTime()) || day1Date > maxDateCopy) {
            alert('Day 1 date cannot be today, in the future, or invalid.');
            return;
        }

        const recallDate2 = formData.meal_items.recall2[0];
        if (section === 'meal-recall-day2' && (!recallDate2 || !isValidDateFormat(recallDate2))) {
            alert('A valid Day 2 date is required.');
            return;
        }

        if (recallDate1 && recallDate2) {
            const day2Date = new Date(recallDate2 + 'T00:00:00Z');
            const diffDays = (day2Date - day1Date) / (1000 * 60 * 60 * 24);
            if (diffDays <= 1) {
                alert('Day 2 date must be at least two days after Day 1 date.');
                return;
            }
            if (diffDays < 0) {
                alert('Day 2 date cannot be before Day 1 date.');
                return;
            }
            if (isNaN(day2Date.getTime()) || day2Date > maxDateCopy) {
                alert('Day 2 date cannot be today, in the future, or invalid.');
                return;
            }
        }
    }

    const sectionData = { uuid, session_id: sessionId, section };

    switch (section) {
        case 'demographic':
            sectionData.data = formData.submissions;
            break;
        case 'anthropometry':
            sectionData.data = {
                weight: formData.submissions.weight,
                height: formData.submissions.height,
                bmi: formData.submissions.bmi
            };
            break;
        case 'dietary':
            sectionData.data = formData.dietary_preferences;
            break;
        case 'physical':
            sectionData.data = formData.physical_activity;
            break;
        case 'frequency':
            sectionData.data = formData.food_frequency;
            break;
        case 'food-items':
            sectionData.data = formData.top_two_items;
            break;
        case 'meal-recall':
            sectionData.data = {
                recall_date: formData.meal_items.recall1[0],
                items: formData.meal_items.items1,
                quantities: formData.meal_items.quantities1,
                units: formData.meal_items.units1
            };
            break;
        case 'meal-recall-day2':
            sectionData.data = {
                recall_date: formData.meal_items.recall2[0],
                items: formData.meal_items.items2,
                quantities: formData.meal_items.quantities2,
                units: formData.meal_items.units2
            };
            break;
        default:
            console.warn('Unknown section:', section);
            return;
    }

    console.log(`Saving section ${section}:`, JSON.stringify(sectionData, null, 2));

    try {
        const response = await fetch('http://localhost:5000/api/save-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sectionData),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || 'Failed to save section');
        }
        const result = await response.json();

        if (result.session_id) {
            localStorage.setItem('sessionId', result.session_id);
            updateUniqueLink(uuid, result.session_id);
        }

        let messageDiv = document.getElementById(`save-message-${section}`);
        if (!messageDiv) {
            messageDiv = document.getElementById('save-message');
            console.warn(`Message div save-message-${section} not found, falling back to save-message`);
        }
        if (messageDiv) {
            messageDiv.classList.remove('comeback-message');
            messageDiv.classList.add('save-message');
            messageDiv.textContent = `${sectionToTitle(section)} saved`;
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
                messageDiv.textContent = '';
            }, 3000);
        }

        savedData[section] = sectionData.data;
        savedData.savedSections[section] = true;
        localStorage.setItem('dietFormData', JSON.stringify(savedData));

        if (section === 'meal-recall') {
            setTimeout(() => {
                unlockSections(section);
                initializeSectionLocking(uuid);
                updateDay2Lock();
            }, 3000);
        } else {
            unlockSections(section);
            initializeSectionLocking(uuid);
            updateDay2Lock();
        }
        console.log(`Successfully saved section ${section}`);
    } catch (error) {
        console.error(`Failed to save section ${section}:`, error.message);
        alert(`Error saving section: ${error.message}`);
    }
}

async function loadData(uuid, sessionId) {
    if (!uuid) {
        console.warn('No UUID provided for loadData');
        return {};
    }
    try {
        const query = sessionId ? `uuid=${uuid}&session_id=${sessionId}` : `uuid=${uuid}`;
        const response = await fetch(`http://localhost:5000/api/data?${query}`);
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        if (data && data.length > 0 && data[0]) {
            if (data[0].session_id) {
                localStorage.setItem('sessionId', data[0].session_id);
                updateUniqueLink(uuid, data[0].session_id);
            }
            localStorage.setItem('dietFormData', JSON.stringify(data[0]));
            console.log('Loaded data:', JSON.stringify(data[0], null, 2));
            populateForm(data[0]);
            return data[0];
        }
    } catch (error) {
        console.error('Error fetching server data:', error.message);
    }
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    if (savedData && Object.keys(savedData).length > 0 && savedData.uuid === uuid) {
        console.log('Loaded local data:', JSON.stringify(savedData, null, 2));
        populateForm(savedData);
        return savedData;
    }
    return {};
}

function populateForm(savedData) {
    if (!savedData) return;

    const recallDate1Input = document.getElementById('recallDate1');
    const recallDate2Input = document.getElementById('recallDate2');
    const originalOnChange1 = recallDate1Input?.onchange;
    const originalOnChange2 = recallDate2Input?.onchange;
    if (recallDate1Input) recallDate1Input.onchange = null;
    if (recallDate2Input) recallDate2Input.onchange = null;

    const fields = [
        { id: 'name', value: savedData.submissions?.name },
        { id: 'age', value: savedData.submissions?.age },
        { id: 'gender', value: savedData.submissions?.gender },
        { id: 'education', value: savedData.submissions?.education },
        { id: 'occupation', value: savedData.submissions?.occupation },
        { id: 'income', value: savedData.submissions?.income_level },
        { id: 'weight', value: savedData.submissions?.weight },
        { id: 'height', value: savedData.submissions?.height },
        { id: 'bmi', value: savedData.submissions?.bmi },
        { id: 'myplate_includes', value: savedData.dietary_preferences?.myplate_includes },
        { id: 'foodgroups_list', value: savedData.dietary_preferences?.foodgroups_list }
    ];
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && field.value) element.value = field.value;
    });

    if (recallDate1Input && savedData.meal_items?.recall1[0]) {
        const dateStr = savedData.meal_items.recall1[0];
        if (isValidDateFormat(dateStr)) {
            const selectedDate = new Date(dateStr + 'T00:00:00Z');
            if (!isNaN(selectedDate.getTime()) && selectedDate <= maxDate) {
                recallDate1Input.value = dateStr;
            } else {
                recallDate1Input.value = '';
                console.warn('Invalid or future recallDate1:', dateStr);
            }
        } else {
            recallDate1Input.value = '';
            console.warn('Malformed recallDate1 format:', dateStr);
        }
    }

    if (recallDate2Input && savedData.meal_items?.recall2[0]) {
        const dateStr = savedData.meal_items.recall2[0];
        if (isValidDateFormat(dateStr)) {
            const selectedDate = new Date(dateStr + 'T00:00:00Z');
            const recallDate1 = recallDate1Input?.value;
            const day1Date = recallDate1 ? new Date(recallDate1 + 'T00:00:00Z') : null;
            const diffDays = day1Date ? (selectedDate - day1Date) / (1000 * 60 * 60 * 24) : null;
            if (!isNaN(selectedDate.getTime()) && selectedDate <= maxDate && (!diffDays || (diffDays > 1 && diffDays >= 0))) {
                recallDate2Input.value = dateStr;
            } else {
                recallDate2Input.value = '';
                console.warn('Invalid, non-consecutive, or past recallDate2:', dateStr);
            }
        } else {
            recallDate2Input.value = '';
            console.warn('Malformed recallDate2 format:', dateStr);
        }
    }

    if (recallDate1Input && originalOnChange1) recallDate1Input.onchange = originalOnChange1;
    if (recallDate2Input && originalOnChange2) recallDate2Input.onchange = originalOnChange2;

    const radioFields = [
        { name: 'myplate', value: savedData.dietary_preferences?.myplate },
        { name: 'foodpyramid', value: savedData.dietary_preferences?.foodpyramid },
        { name: 'dietaryguidelines', value: savedData.dietary_preferences?.dietaryguidelines },
        { name: 'learn_source', value: savedData.dietary_preferences?.learn_source },
        { name: 'balancedmeals', value: savedData.dietary_preferences?.balancedmeals },
        { name: 'foodgroups', value: savedData.dietary_preferences?.foodgroups },
        { name: 'servings', value: savedData.dietary_preferences?.servings },
        { name: 'foodpyramid_base', value: savedData.dietary_preferences?.foodpyramid_base },
        { name: 'preference_reason', value: savedData.dietary_preferences?.preference_reason },
        { name: 'barrier', value: savedData.dietary_preferences?.barrier },
        { name: 'practical', value: savedData.dietary_preferences?.practical },
        { name: 'diet_type', value: savedData.dietary_preferences?.diet_type },
        { name: 'aware_physical', value: savedData.physical_activity?.aware_physical },
        { name: 'engage_daily', value: savedData.physical_activity?.engage_daily },
        { name: 'activity_type', value: savedData.physical_activity?.activity_type },
        { name: 'duration', value: savedData.physical_activity?.duration },
        { name: 'frequency', value: savedData.physical_activity?.frequency }
    ];
    radioFields.forEach(field => {
        const fieldValue = field.name === 'frequency' && field.value ? field.value.trim() : (field.value || '');
        const radio = document.querySelector(`input[name="${field.name}"][value="${fieldValue}"]`);
        if (radio) {
            radio.checked = true;
            if (radio.getAttribute('onchange')) {
                toggleQuestion(radio, radio.getAttribute('onchange').split("'")[1]);
            }
        } else if (fieldValue) {
            console.warn(`Radio button not found for ${field.name} with value "${fieldValue}"`);
        }
    });

    checkFirstThree();

    const foodFrequencyFields = [
        'cereal_milled', 'cereal_whole', 'pulses', 'green_leafy', 'other_veg',
        'roots_tubers', 'fruits', 'nuts_seeds', 'milk_products', 'meat_products',
        'sugars', 'fried_foods', 'sugary_bev', 'packaged_snacks', 'pizzas_burgers',
        'confectionery'
    ];
    foodFrequencyFields.forEach(field => {
        const value = savedData.food_frequency?.[field] || '';
        const radio = document.querySelector(`input[name="${field}_freq"][value="${value}"]`);
        if (radio) radio.checked = true;
    });

    const topTwoFields = [
        'cereal_milled_highest', 'cereal_milled_second', 'cereal_whole_highest', 'cereal_whole_second',
        'pulses_highest', 'pulses_second', 'green_leafy_highest', 'green_leafy_second',
        'other_veg_highest', 'other_veg_second', 'roots_tubers_highest', 'roots_tubers_second',
        'fruits_highest', 'fruits_second', 'nuts_seeds_highest', 'nuts_seeds_second',
        'milk_products_highest', 'milk_products_second', 'meat_products_highest', 'meat_products_second',
        'sugary_bev_highest', 'sugary_bev_second', 'confectionery_highest', 'confectionery_second',
        'fried_foods_highest', 'fried_foods_second'
    ];
    topTwoFields.forEach(field => {
        const select = document.querySelector(`select[name="${field}"]`);
        if (select && savedData.top_two_items?.[field]) {
            select.value = savedData.top_two_items[field];
            select.dispatchEvent(new Event('change'));
        }
    });

    [1, 2].forEach(day => {
        mealTimes.forEach(mealTime => {
            const tableId = `mealRecallTableDay${day}_${mealTime}`;
            const tableBody = document.getElementById(tableId)?.getElementsByTagName('tbody')[0];
            if (!tableBody) {
                console.error(`Table body not found for ID: ${tableId}`);
                return;
            }

            const itemsKey = `items${day}`;
            const quantitiesKey = `quantities${day}`;
            const unitsKey = `units${day}`;
            if (savedData.meal_items?.[itemsKey]?.[mealTime]) {
                const items = savedData.meal_items[itemsKey][mealTime] || [];
                const quantities = savedData.meal_items[quantitiesKey][mealTime] || [];
                const units = savedData.meal_items[unitsKey][mealTime] || [];

                tableBody.innerHTML = '';
                const seen = new Set();
                for (let i = 0; i < items.length; i++) {
                    const item = items[i] || '';
                    const quantity = quantities[i] !== undefined ? quantities[i] : '0';
                    const unit = units[i] || 'cups';
                    const key = `${item}|${quantity}|${unit}`;
                    if (item && !seen.has(key)) {
                        seen.add(key);
                        console.log(`Populating Day ${day}, ${mealTime}, Row ${i}:`, { item, quantity, unit });
                        addMealRow(day, mealTime, tableBody, null, item, quantity, unit);
                    }
                }
            }
        });
    });
}

function initializeSectionLocking(uuid) {
    const sections = [
        'demographic', 'anthropometry', 'dietary', 'physical', 'frequency',
        'food-items', 'unit-reference', 'meal-recall', 'meal-recall-day2'
    ];
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    const savedSections = savedData.savedSections || {};

    document.querySelectorAll('.survey-section').forEach(section => {
        const sectionName = section.getAttribute('data-section');
        if (sectionName !== 'demographic' && !savedSections[sectionName]) {
            section.classList.add('blurred');
        } else {
            section.classList.remove('blurred');
        }
    });

    unlockFirstUnsavedSection(savedSections);
    updateDay2Lock();
}

function unlockSections(currentSection) {
    const sectionOrder = [
        'demographic', 'anthropometry', 'dietary', 'physical', 'frequency',
        'food-items', 'unit-reference', 'meal-recall', 'meal-recall-day2'
    ];
    const currentIndex = sectionOrder.indexOf(currentSection);
    const currentSectionElement = document.querySelector(`.survey-section[data-section="${currentSection}"]`);
    if (currentSectionElement) {
        currentSectionElement.classList.remove('blurred');
    }

    if (currentIndex < sectionOrder.length - 1) {
        const nextSection = sectionOrder[currentIndex + 1];
        if (nextSection !== 'unit-reference' && (nextSection !== 'meal-recall-day2' || currentSection === 'meal-recall')) {
            const nextSectionElement = document.querySelector(`.survey-section[data-section="${nextSection}"]`);
            if (nextSectionElement) {
                nextSectionElement.classList.remove('blurred');
                nextSectionElement.offsetHeight;
                console.log(`Unblurred section: ${nextSection}`);
            }
        }
    }

    if (currentSection === 'food-items') {
        const unitReferenceSection = document.querySelector('.survey-section[data-section="unit-reference"]');
        const mealRecallSection = document.querySelector('.survey-section[data-section="meal-recall"]');
        if (unitReferenceSection) {
            unitReferenceSection.classList.remove('blurred');
            unitReferenceSection.offsetHeight;
        }
        if (mealRecallSection) {
            mealRecallSection.classList.remove('blurred');
            mealRecallSection.offsetHeight;
        }
        console.log('Unblurred unit-reference and meal-recall after food-items');
    }

    updateDay2Lock();
}

function unlockFirstUnsavedSection(savedSections) {
    const sectionOrder = [
        'demographic', 'anthropometry', 'dietary', 'physical', 'frequency',
        'food-items', 'unit-reference', 'meal-recall', 'meal-recall-day2'
    ];
    let firstUnsaved = sectionOrder.find(section => !savedSections[section] && section !== 'unit-reference' && section !== 'meal-recall-day2');
    if (!firstUnsaved) firstUnsaved = 'demographic';

    const sectionElement = document.querySelector(`.survey-section[data-section="${firstUnsaved}"]`);
    if (sectionElement) {
        sectionElement.classList.remove('blurred');
        sectionElement.offsetHeight;
        console.log(`Unblurred first unsaved section: ${firstUnsaved}`);
    }

    if (savedSections['food-items']) {
        const unitReferenceSection = document.querySelector('.survey-section[data-section="unit-reference"]');
        const mealRecallSection = document.querySelector('.survey-section[data-section="meal-recall"]');
        if (unitReferenceSection) {
            unitReferenceSection.classList.remove('blurred');
            unitReferenceSection.offsetHeight;
        }
        if (mealRecallSection) {
            mealRecallSection.classList.remove('blurred');
            mealRecallSection.offsetHeight;
        }
        console.log('Unblurred unit-reference and meal-recall due to saved food-items');
    }

    updateDay2Lock();
}

function resetPage(oldUuid) {
    const newUuid = uuidv4();
    setCookie('uuid', newUuid, 30);
    localStorage.setItem('uuid', newUuid);
    localStorage.removeItem('sessionId');
    localStorage.removeItem('dietFormData');

    const uuidText = document.getElementById('uuidText');
    const uniqueLink = document.getElementById('uniqueLink');
    if (uuidText && uniqueLink) {
        uuidText.textContent = newUuid;
        updateUniqueLink(newUuid, null);
    }

    const form = document.getElementById('dietForm');
    if (form) {
        form.reset();
        [1, 2].forEach(day => {
            mealTimes.forEach(mealTime => {
                const tableId = `mealRecallTableDay${day}_${mealTime}`;
                const tableBody = document.getElementById(tableId)?.getElementsByTagName('tbody')[0];
                if (tableBody) {
                    tableBody.innerHTML = '';
                    updateAddButtonVisibility(day, mealTime);
                }
            });
        });
    }

    checkFirstThree();
    initializeSectionLocking(newUuid);
    updateDay2Lock();
}

function collectFormData(uuid) {
    const nameInput = document.getElementById('name');
    const ageInput = document.getElementById('age');
    const genderInput = document.getElementById('gender');
    const educationInput = document.getElementById('education');
    const occupationInput = document.getElementById('occupation');
    const incomeInput = document.getElementById('income');
    const weightInput = document.getElementById('weight');
    const heightInput = document.getElementById('height');
    const bmiInput = document.getElementById('bmi');
    const myplateIncludesInput = document.getElementById('myplate_includes');
    const foodgroupsListInput = document.getElementById('foodgroups_list');

    const formData = {
        uuid,
        submissions: {
            name: nameInput?.value || '',
            age: ageInput?.value || '',
            gender: genderInput?.value || '',
            education: educationInput?.value || '',
            occupation: occupationInput?.value || '',
            income_level: incomeInput?.value || '',
            weight: weightInput?.value || '',
            height: heightInput?.value || '',
            bmi: bmiInput?.value || ''
        },
        dietary_preferences: {
            myplate: document.querySelector('input[name="myplate"]:checked')?.value || '',
            foodpyramid: document.querySelector('input[name="foodpyramid"]:checked')?.value || '',
            dietaryguidelines: document.querySelector('input[name="dietaryguidelines"]:checked')?.value || '',
            learn_source: document.querySelector('input[name="learn_source"]:checked')?.value || '',
            myplate_includes: myplateIncludesInput?.value || '',
            balancedmeals: document.querySelector('input[name="balancedmeals"]:checked')?.value || '',
            foodgroups: document.querySelector('input[name="foodgroups"]:checked')?.value || '',
            foodgroups_list: foodgroupsListInput?.value || '',
            servings: document.querySelector('input[name="servings"]:checked')?.value || '',
            foodpyramid_base: document.querySelector('input[name="foodpyramid_base"]:checked')?.value || '',
            preference_reason: document.querySelector('input[name="preference_reason"]:checked')?.value || '',
            barrier: document.querySelector('input[name="barrier"]:checked')?.value || '',
            practical: document.querySelector('input[name="practical"]:checked')?.value || '',
            diet_type: document.querySelector('input[name="diet_type"]:checked')?.value || ''
        },
        physical_activity: {
            aware_physical: document.querySelector('input[name="aware_physical"]:checked')?.value || '',
            engage_daily: document.querySelector('input[name="engage_daily"]:checked')?.value || '',
            activity_type: document.querySelector('input[name="activity_type"]:checked')?.value || '',
            duration: document.querySelector('input[name="duration"]:checked')?.value || '',
            frequency: document.querySelector('input[name="frequency"]:checked')?.value || ''
        },
        food_frequency: {
            cereal_milled: document.querySelector('input[name="cereal_milled_freq"]:checked')?.value || '',
            cereal_whole: document.querySelector('input[name="cereal_whole_freq"]:checked')?.value || '',
            pulses: document.querySelector('input[name="pulses_freq"]:checked')?.value || '',
            green_leafy: document.querySelector('input[name="green_leafy_freq"]:checked')?.value || '',
            other_veg: document.querySelector('input[name="other_veg_freq"]:checked')?.value || '',
            roots_tubers: document.querySelector('input[name="roots_tubers_freq"]:checked')?.value || '',
            fruits: document.querySelector('input[name="fruits_freq"]:checked')?.value || '',
            nuts_seeds: document.querySelector('input[name="nuts_seeds_freq"]:checked')?.value || '',
            milk_products: document.querySelector('input[name="milk_products_freq"]:checked')?.value || '',
            meat_products: document.querySelector('input[name="meat_products_freq"]:checked')?.value || '',
            sugars: document.querySelector('input[name="sugars_freq"]:checked')?.value || '',
            fried_foods: document.querySelector('input[name="fried_foods_freq"]:checked')?.value || '',
            sugary_bev: document.querySelector('input[name="sugary_bev_freq"]:checked')?.value || '',
            packaged_snacks: document.querySelector('input[name="packaged_snacks_freq"]:checked')?.value || '',
            pizzas_burgers: document.querySelector('input[name="pizzas_burgers_freq"]:checked')?.value || '',
            confectionery: document.querySelector('input[name="confectionery_freq"]:checked')?.value || ''
        },
        top_two_items: {
            cereal_milled_highest: document.querySelector('select[name="cereal_milled_highest"]')?.value || '',
            cereal_milled_second: document.querySelector('select[name="cereal_milled_second"]')?.value || '',
            cereal_whole_highest: document.querySelector('select[name="cereal_whole_highest"]')?.value || '',
            cereal_whole_second: document.querySelector('select[name="cereal_whole_second"]')?.value || '',
            pulses_highest: document.querySelector('select[name="pulses_highest"]')?.value || '',
            pulses_second: document.querySelector('select[name="pulses_second"]')?.value || '',
            green_leafy_highest: document.querySelector('select[name="green_leafy_highest"]')?.value || '',
            green_leafy_second: document.querySelector('select[name="green_leafy_second"]')?.value || '',
            other_veg_highest: document.querySelector('select[name="other_veg_highest"]')?.value || '',
            other_veg_second: document.querySelector('select[name="other_veg_second"]')?.value || '',
            roots_tubers_highest: document.querySelector('select[name="roots_tubers_highest"]')?.value || '',
            roots_tubers_second: document.querySelector('select[name="roots_tubers_second"]')?.value || '',
            fruits_highest: document.querySelector('select[name="fruits_highest"]')?.value || '',
            fruits_second: document.querySelector('select[name="fruits_second"]')?.value || '',
            nuts_seeds_highest: document.querySelector('select[name="nuts_seeds_highest"]')?.value || '',
            nuts_seeds_second: document.querySelector('select[name="nuts_seeds_second"]')?.value || '',
            milk_products_highest: document.querySelector('select[name="milk_products_highest"]')?.value || '',
            milk_products_second: document.querySelector('select[name="milk_products_second"]')?.value || '',
            meat_products_highest: document.querySelector('select[name="meat_products_highest"]')?.value || '',
            meat_products_second: document.querySelector('select[name="meat_products_second"]')?.value || '',
            sugary_bev_highest: document.querySelector('select[name="sugary_bev_highest"]')?.value || '',
            sugary_bev_second: document.querySelector('select[name="sugary_bev_second"]')?.value || '',
            confectionery_highest: document.querySelector('select[name="confectionery_highest"]')?.value || '',
            confectionery_second: document.querySelector('select[name="confectionery_second"]')?.value || '',
            fried_foods_highest: document.querySelector('select[name="fried_foods_highest"]')?.value || '',
            fried_foods_second: document.querySelector('select[name="fried_foods_second"]')?.value || ''
        },
        meal_items: {
            recall1: Array(7).fill(null),
            items1: {},
            quantities1: {},
            units1: {},
            recall2: Array(7).fill(null),
            items2: {},
            quantities2: {},
            units2: {}
        }
    };

    const recallDate1 = document.getElementById('recallDate1')?.value || null;
    formData.meal_items.recall1 = Array(7).fill(recallDate1);

    const recallDate2 = document.getElementById('recallDate2')?.value || null;
    formData.meal_items.recall2 = Array(7).fill(recallDate2);

    [1, 2].forEach(day => {
        mealTimes.forEach((mealTime, index) => {
            const items = Array.from(document.querySelectorAll(`input[name="item${day}_${mealTime}[]"]`)).map(input => input?.value.trim() || '');
            const quantities = Array.from(document.querySelectorAll(`input[name="quantity${day}_${mealTime}[]"]`)).map(input => input?.value || '0');
            const units = Array.from(document.querySelectorAll(`select[name="unit${day}_${mealTime}[]"]`)).map(select => select?.value || 'cups');
            const indices = Array.from(document.querySelectorAll(`#mealRecallTableDay${day}_${mealTime} tbody tr`)).map(row => row.getAttribute('data-row-index'));

            const validData = [];
            items.forEach((item, i) => {
                if (item && indices[i]) {
                    validData.push({
                        item,
                        quantity: quantities[i],
                        unit: units[i],
                        index: indices[i]
                    });
                }
            });

            console.log(`Collected meal-recall data for Day ${day}, ${mealTime}:`, validData);

            formData.meal_items[`items${day}`][mealTime] = validData.map(d => d.item);
            formData.meal_items[`quantities${day}`][mealTime] = validData.map(d => d.quantity);
            formData.meal_items[`units${day}`][mealTime] = validData.map(d => d.unit);
        });
    });

    console.log('Collected form data:', JSON.stringify(formData, null, 2));

    return formData;
}