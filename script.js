const today = new Date();
const maxDate = new Date(today);
maxDate.setDate(today.getDate() - 1); // Yesterday

// Define mealTimes globally
const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];

// Inline UUID v4 generator
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Cookie handling functions
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

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UUID
    let uuid = getCookie('uuid') || localStorage.getItem('uuid');
    const urlParams = new URLSearchParams(window.location.search);
    const urlUuid = urlParams.get('uuid');
    if (urlUuid) {
        uuid = urlUuid;
    }
    if (!uuid) {
        uuid = uuidv4();
    }
    setCookie('uuid', uuid, 30);
    localStorage.setItem('uuid', uuid);
    
    // Display UUID and unique link
    const uuidText = document.getElementById('uuidText');
    const uniqueLink = document.getElementById('uniqueLink');
    if (uuidText && uniqueLink) {
        uuidText.textContent = uuid;
        uniqueLink.href = `${window.location.origin}${window.location.pathname}?uuid=${uuid}`;
        uniqueLink.textContent = `${window.location.origin}${window.location.pathname}?uuid=${uuid}`;
    }

    // Check dietary preferences visibility
    checkFirstThree();
    
    // Toggle questions based on initial radio states
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (radio.checked && radio.getAttribute('onchange')) {
            toggleQuestion(radio, radio.getAttribute('onchange').split("'")[1]);
        }
    });

    // Initialize meal recall rows and add change listeners
    mealTimes.forEach(mealTime => {
        const numItemsInput = document.getElementById(`numItems1_${mealTime}`);
        if (numItemsInput) {
            // Remove existing listeners to prevent duplicates
            const newInput = numItemsInput.cloneNode(true);
            numItemsInput.parentNode.replaceChild(newInput, numItemsInput);
            // Generate initial rows
            generateRows(mealTime, 1);
            // Add new listener
            newInput.addEventListener('change', () => {
                console.log(`numItems change: mealTime=${mealTime}, value=${newInput.value}`);
                generateRows(mealTime, 1);
            });
            newInput.removeAttribute('min');
        }
    });

    // Setup BMI button
    const calcBMIBtn = document.getElementById('calcBMIBtn');
    if (calcBMIBtn) {
        calcBMIBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            calculateBMI();
        });
    }

    // Load saved data and initialize section locking
    loadData(uuid).then(() => {
        initializeSectionLocking(uuid);
    });

    // Setup top-two dropdowns
    const topTwoGroups = [
        "cereal_milled", "cereal_whole", "pulses", "green_leafy", "other_veg",
        "roots_tubers", "fruits", "nuts_seeds", "milk_products", "meat_products",
        "sugary_bev", "confectionery", "fried_foods"
    ];
    topTwoGroups.forEach(group => setupTopTwoDropdowns(group));

    // Convert checkboxes to radios for food frequency
    enforceSingleSelectionPerRow();

    // Setup Next buttons
    document.querySelectorAll('.next-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            const section = button.getAttribute('data-section');
            await saveSection(uuid, section);
        });
    });

    // Setup Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            await saveAllData(uuid);
        });
    }
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
    const h2Elements = document.querySelectorAll("section h2");
    let targetSection = null;
    for (const h2 of h2Elements) {
        if (h2.textContent.includes("Food Frequency Questionnaire")) {
            targetSection = h2.closest("section");
            break;
        }
    }
    
    const table = targetSection?.querySelector("table");
    if (!table) {
        console.error("Food Frequency table not found");
        return;
    }
    
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row, rowIndex) => {
        const inputs = row.querySelectorAll("input[type='checkbox'], input[type='radio']");
        inputs.forEach(cb => {
            if (cb.type === 'checkbox') {
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = cb.name;
                radio.value = cb.value;
                radio.checked = cb.checked;
                cb.parentNode.replaceChild(radio, cb);
            }
            cb.addEventListener('change', function() {
                const rowRadios = row.querySelectorAll(`input[name="${this.name}"]`);
                rowRadios.forEach(r => {
                    if (r !== this) r.checked = eastward;
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

function generateRows(mealTime, day) {
    const numItemsInput = document.getElementById(`numItems${day}_${mealTime}`);
    let numItems = parseInt(numItemsInput?.value) || 0;
    numItems = Math.max(0, Math.min(numItems, 10));
    console.log(`generateRows: mealTime=${mealTime}, day=${day}, numItems=${numItems}`);
    numItemsInput.value = numItems;
    const tableId = `mealRecallTableDay${day}_${mealTime}`;
    const tableBody = document.getElementById(tableId)?.getElementsByTagName('tbody')[0];
    if (!tableBody) {
        console.error(`Table body not found for ID: ${tableId}`);
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    if (numItems > 0) {
        for (let i = 0; i < numItems; i++) {
            const row = tableBody.insertRow();
            const dayPrefix = '1';
            row.innerHTML = `
                <td><input type="text" name="item${dayPrefix}_${mealTime}[]"></td>
                <td><input type="number" name="quantity${dayPrefix}_${mealTime}[]" step="0.1" min="0" value="0"></td>
                <td>
                    <select name="unit${dayPrefix}_${mealTime}[]">
                        <option value="cups">Cup(s)</option>
                        <option value="tablespoons">Tablespoon(s)</option>
                        <option value="teaspoons">Teaspoon(s)</option>
                        <option value="pieces">Piece(s)</option>
                        <option value="small_glass">Small glass(es)</option>
                    </select>
                </td>
            `;
        }
    }
}

function validateDate(input) {
    const selectedDate = new Date(input.value);
    // Reset only if date is invalid or in the future
    if (!input.value || isNaN(selectedDate.getTime()) || selectedDate > maxDate) {
        alert(`Please select a valid date up to ${maxDate.toISOString().split('T')[0]}. Future dates and today are not allowed.`);
        input.value = maxDate.toISOString().split('T')[0];
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

async function saveSection(uuid, section) {
    const formData = collectFormData(uuid);
    if (!formData) {
        alert('No data to save for this section.');
        return;
    }

    // Extract section-specific data
    const sectionData = { uuid, section };
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
        console.log(`Section ${section} saved successfully`);

        // Show temporary "Section saved!" message
        const messageDiv = document.getElementById(`save-message-${section}`);
        if (messageDiv) {
            messageDiv.textContent = `${sectionToTitle(section)} saved!`;
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
                messageDiv.textContent = '';
            }, 3000);
        }

        // Update local storage
        const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
        savedData[section] = sectionData.data;
        savedData.savedSections = savedData.savedSections || {};
        savedData.savedSections[section] = true;
        localStorage.setItem('dietFormData', JSON.stringify(savedData));

        // Unlock current and next section
        unlockSections(section);
    } catch (error) {
        console.error(`Error saving section ${section}:`, error.message);
        alert(`Error saving section: ${error.message}`);
    }
}

async function saveAllData(uuid) {
    const formData = collectFormData(uuid);
    if (!formData) {
        alert('No data to save.');
        return;
    }

    console.log('Saving all data:', JSON.stringify(formData, null, 2));

    try {
        const response = await fetch('http://localhost:5000/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || 'Failed to save data');
        }
        console.log('All data saved successfully');

        // Show final message
        const messageDiv = document.getElementById('save-message-meal-recall');
        if (messageDiv) {
            messageDiv.textContent = 'All your details saved successfully. Thank you for your time!!';
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
                messageDiv.textContent = '';
            }, 5000);
        }

        // Update local storage
        localStorage.setItem('dietFormData', JSON.stringify(formData));
        formData.savedSections = {
            demographic: true,
            anthropometry: true,
            dietary: true,
            physical: true,
            frequency: true,
            'food-items': true,
            'meal-recall': true
        };
        localStorage.setItem('dietFormData', JSON.stringify(formData));

        // Unlock all sections
        document.querySelectorAll('.survey-section').forEach(section => {
            section.classList.remove('locked');
        });

        // Reset form and generate new UUID
        const newUuid = uuidv4();
        setCookie('uuid', newUuid, 30);
        localStorage.setItem('uuid', newUuid);
        const uuidText = document.getElementById('uuidText');
        const uniqueLink = document.getElementById('uniqueLink');
        if (uuidText && uniqueLink) {
            uuidText.textContent = newUuid;
            uniqueLink.href = `${window.location.pathname}?uuid=${newUuid}`;
            uniqueLink.textContent = `${window.location.origin}${window.location.pathname}?uuid=${newUuid}`;
        }
        const form = document.getElementById('dietForm');
        if (form) {
            form.reset();
            mealTimes.forEach(mealTime => {
                const numItemsInput = document.getElementById(`numItems1_${mealTime}`);
                if (numItemsInput) {
                    numItemsInput.value = 1;
                    generateRows(mealTime, 1);
                }
            });
            localStorage.removeItem('dietFormData');
            checkFirstThree();
            initializeSectionLocking(newUuid);
        }
    } catch (error) {
        console.error('Error saving all data:', error.message);
        alert(`Error saving data: ${error.message}`);
    }
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
            myplate: document.querySelector('input[name="myplate"]:checked')?.value || 'no',
            foodpyramid: document.querySelector('input[name="foodpyramid"]:checked')?.value || 'no',
            dietaryguidelines: document.querySelector('input[name="dietaryguidelines"]:checked')?.value || 'no',
            learn_source: document.querySelector('input[name="learn_source"]:checked')?.value || '',
            myplate_includes: myplateIncludesInput?.value || '',
            balancedmeals: document.querySelector('input[name="balancedmeals"]:checked')?.value || 'no',
            foodgroups: document.querySelector('input[name="foodgroups"]:checked')?.value || 'no',
            foodgroups_list: foodgroupsListInput?.value || '',
            servings: document.querySelector('input[name="servings"]:checked')?.value || 'no',
            foodpyramid_base: document.querySelector('input[name="foodpyramid_base"]:checked')?.value || '',
            preference_reason: document.querySelector('input[name="preference_reason"]:checked')?.value || '',
            barrier: document.querySelector('input[name="barrier"]:checked')?.value || '',
            practical: document.querySelector('input[name="practical"]:checked')?.value || 'no',
            diet_type: document.querySelector('input[name="diet_type"]:checked')?.value || ''
        },
        physical_activity: {
            aware_physical: document.querySelector('input[name="aware_physical"]:checked')?.value || 'no',
            engage_daily: document.querySelector('input[name="engage_daily"]:checked')?.value || 'no',
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
            units1: {}
        }
    };

    // Use the single date picker value as a string without timezone conversion
    const recallDate = document.getElementById('recallDate1')?.value || null;
    formData.meal_items.recall1 = Array(7).fill(recallDate);

    mealTimes.forEach((mealTime, index) => {
        const items = Array.from(document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)).map(input => input?.value || '');
        const quantities = Array.from(document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)).map(input => input?.value || '');
        const units = Array.from(document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)).map(select => select?.value || '');

        // Deduplicate items while preserving associated quantities and units
        const seen = new Map();
        const dedupedItems = [];
        const dedupedQuantities = [];
        const dedupedUnits = [];

        items.forEach((item, i) => {
            const key = item.toLowerCase().trim();
            if (key === '') return; // Skip empty items
            if (!seen.has(key)) {
                seen.set(key, { item, quantity: quantities[i], unit: units[i] });
            }
        });

        seen.forEach(value => {
            dedupedItems.push(value.item);
            dedupedQuantities.push(value.quantity);
            dedupedUnits.push(value.unit);
        });

        const numItemsInput = document.getElementById(`numItems1_${mealTime}`);
        const itemCount = parseInt(numItemsInput?.value) || dedupedItems.length;
        formData.meal_items.items1[mealTime] = dedupedItems.slice(0, itemCount);
        formData.meal_items.quantities1[mealTime] = dedupedQuantities.slice(0, itemCount);
        formData.meal_items.units1[mealTime] = dedupedUnits.slice(0, itemCount);
    });

    return formData;
}

async function loadData(uuid) {
    if (!uuid) {
        console.warn('No UUID provided for loadData');
        return;
    }
    try {
        console.log('Fetching data for UUID:', uuid);
        const response = await fetch(`http://localhost:5000/api/data?uuid=${uuid}`);
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || 'Failed to fetch data');
        }
        const data = await response.json();
        console.log('Fetched server data:', JSON.stringify(data, null, 2));
        if (data && data.length > 0 && data[0]) {
            populateForm(data[0]);
            localStorage.setItem('dietFormData', JSON.stringify(data[0]));
            return data[0];
        } else {
            console.warn('No server data found for UUID:', uuid);
        }
    } catch (error) {
        console.error('Error fetching server data:', error.message);
    }
    // Fallback to localStorage
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    if (savedData && Object.keys(savedData).length > 0 && savedData.uuid === uuid) {
        console.log('Loading data from localStorage:', JSON.stringify(savedData, null, 2));
        populateForm(savedData);
        return savedData;
    } else {
        console.warn('No valid localStorage data found for UUID:', uuid);
        return {};
    }
}

function populateForm(savedData) {
    if (!savedData) return;

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
        if (element) element.value = field.value || '';
    });

    // Handle recallDate1 to preserve saved date
    const recallDateInput = document.getElementById('recallDate1');
    if (recallDateInput && savedData.meal_items?.recall1[0]) {
        console.log('Loading recallDate1:', savedData.meal_items.recall1[0]);
        recallDateInput.value = savedData.meal_items.recall1[0];
        const selectedDate = new Date(recallDateInput.value);
        // Only reset if date is invalid or in the future
        if (!recallDateInput.value || isNaN(selectedDate.getTime()) || selectedDate > maxDate) {
            console.warn(`Saved date ${recallDateInput.value} is invalid or in the future. Resetting to ${maxDate.toISOString().split('T')[0]}.`);
            recallDateInput.value = maxDate.toISOString().split('T')[0];
        }
    }

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
        { name: 'aware_physical', value: savedData.physical_activity?.aware_physical }
    ];
    radioFields.forEach(field => {
        const radio = document.querySelector(`input[name="${field.name}"][value="${field.value || ''}"]`);
        if (radio) {
            radio.checked = true;
            if (radio.getAttribute('onchange')) {
                toggleQuestion(radio, radio.getAttribute('onchange').split("'")[1]);
            }
        }
    });

    // Handle physical activity questions with dependency
    const engageDailyRadio = document.querySelector(`input[name="engage_daily"][value="${savedData.physical_activity?.engage_daily || ''}"]`);
    if (engageDailyRadio) {
        engageDailyRadio.checked = true;
        toggleQuestion(engageDailyRadio, 'engage_daily');
    }

    const activityTypeRadio = document.querySelector(`input[name="activity_type"][value="${savedData.physical_activity?.activity_type || ''}"]`);
    if (activityTypeRadio) {
        activityTypeRadio.checked = true;
    }

    const durationRadio = document.querySelector(`input[name="duration"][value="${savedData.physical_activity?.duration || ''}"]`);
    if (durationRadio) {
        durationRadio.checked = true;
    }

    const frequencyRadio = document.querySelector(`input[name="frequency"][value="${savedData.physical_activity?.frequency || ''}"]`);
    if (frequencyRadio) {
        frequencyRadio.checked = true;
    } else if (savedData.physical_activity?.frequency) {
        console.warn('Frequency radio not found for value:', savedData.physical_activity.frequency);
    }

    const foodFrequencyFields = [
        'cereal_milled', 'cereal_whole', 'pulses', 'green_leafy', 'other_veg',
        'roots_tubers', 'fruits', 'nuts_seeds', 'milk_products', 'meat_products',
        'sugars', 'fried_foods', 'sugary_bev', 'packaged_snacks', 'pizzas_burgers',
        'confectionery'
    ];
    foodFrequencyFields.forEach(field => {
        const value = savedData.food_frequency?.[field] || '';
        const radio = document.querySelector(`input[name="${field}_freq"][value="${value}"]`);
        if (radio) {
            radio.checked = true;
        }
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
        if (select) {
            select.value = savedData.top_two_items?.[field] || '';
            select.dispatchEvent(new Event('change'));
        }
    });

    mealTimes.forEach((mealTime, index) => {
        if (savedData.meal_items?.items1?.[mealTime]) {
            const numItemsInput = document.getElementById(`numItems1_${mealTime}`);
            if (numItemsInput) {
                const items = savedData.meal_items.items1[mealTime];
                const quantities = savedData.meal_items.quantities1[mealTime];
                const units = savedData.meal_items.units1[mealTime];

                // Deduplicate items while preserving associated quantities and units
                const seen = new Map();
                const dedupedItems = [];
                const dedupedQuantities = [];
                const dedupedUnits = [];

                items.forEach((item, i) => {
                    const key = item.toLowerCase().trim();
                    if (key === '') return; // Skip empty items
                    if (!seen.has(key)) {
                        seen.set(key, { item, quantity: quantities[i], unit: units[i] });
                    }
                });

                seen.forEach(value => {
                    dedupedItems.push(value.item);
                    dedupedQuantities.push(value.quantity);
                    dedupedUnits.push(value.unit);
                });

                const itemCount = Math.min(dedupedItems.length, 10);
                numItemsInput.value = itemCount;
                generateRows(mealTime, 1);
                if (itemCount > 0) {
                    const rows = document.getElementById(`mealRecallTableDay1_${mealTime}`).getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                    dedupedItems.slice(0, itemCount).forEach((item, i) => {
                        const input = rows[i]?.getElementsByTagName('input')[0];
                        if (input) input.value = item || '';
                    });
                    dedupedQuantities.slice(0, itemCount).forEach((qty, i) => {
                        const input = rows[i]?.getElementsByTagName('input')[1];
                        if (input) input.value = qty || '0';
                    });
                    dedupedUnits.slice(0, itemCount).forEach((unit, i) => {
                        const select = rows[i]?.getElementsByTagName('select')[0];
                        if (select) select.value = unit || 'cups';
                    });
                }
            }
        }
    });

    checkFirstThree();
}

function initializeSectionLocking(uuid) {
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    const savedSections = savedData.savedSections || {};
    const sections = ['demographic', 'anthropometry', 'dietary', 'physical', 'frequency', 'food-items', 'meal-recall'];
    
    // Lock all sections except the first unsaved one
    let firstUnsaved = 'demographic';
    sections.forEach((section, index) => {
        const sectionElement = document.querySelector(`.survey-section[data-section="${section}"]`);
        if (sectionElement) {
            if (savedSections[section]) {
                sectionElement.classList.remove('locked');
            } else {
                sectionElement.classList.add('locked');
                if (!firstUnsaved && index > 0) {
                    firstUnsaved = section;
                }
            }
        }
    });

    // Unlock the first unsaved section
    const firstSection = document.querySelector(`.survey-section[data-section="${firstUnsaved}"]`);
    if (firstSection) {
        firstSection.classList.remove('locked');
    }
}

function unlockSections(currentSection) {
    const sections = ['demographic', 'anthropometry', 'dietary', 'physical', 'frequency', 'food-items', 'meal-recall'];
    const currentIndex = sections.indexOf(currentSection);
    
    // Unlock current section
    const currentSectionElement = document.querySelector(`.survey-section[data-section="${currentSection}"]`);
    if (currentSectionElement) {
        currentSectionElement.classList.remove('locked');
    }

    // Unlock next section if it exists
    if (currentIndex < sections.length - 1) {
        const nextSection = sections[currentIndex + 1];
        const nextSectionElement = document.querySelector(`.survey-section[data-section="${nextSection}"]`);
        if (nextSectionElement) {
            nextSectionElement.classList.remove('locked');
        }
    }
}

function sectionToTitle(section) {
    const titles = {
        demographic: 'Demographic Information',
        anthropometry: 'Anthropometry',
        dietary: 'Dietary Assessment',
        physical: 'Physical Activity',
        frequency: 'Food Frequency Questionnaire',
        'food-items': 'List of Food Items (Higher Frequency)',
        'meal-recall': '24-Hour Meal Recall - Day 1'
    };
    return titles[section] || section;
}