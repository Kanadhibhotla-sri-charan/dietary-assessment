const today = new Date();
const maxDate = new Date(today);
maxDate.setDate(today.getDate() - 1); // Yesterday

document.addEventListener('DOMContentLoaded', () => {
    checkFirstThree();
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (radio.checked && radio.getAttribute('onchange')) {
            toggleQuestion(radio, radio.getAttribute('onchange').split("'")[1]);
        }
    });

    // Initialize meal recall rows for all meal times and add change listeners
    const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    mealTimes.forEach(mealTime => {
        const numItems = document.getElementById(`numItems1_${mealTime}`);
        if (numItems) {
            generateRows(mealTime, 1); // Initial generation
            numItems.addEventListener('change', () => generateRows(mealTime, 1)); // Dynamic update
            numItems.removeAttribute('min');
        }
    });

    // Ensure BMI button works with event listener and prevent form submission
    const calcBMIBtn = document.getElementById('calcBMIBtn');
    if (calcBMIBtn) {
        calcBMIBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission
            event.stopPropagation(); // Stop event bubbling
            calculateBMI();
        });
    }

    // Date validation setup for Day 1 date picker
    const day1DateInput = document.getElementById('day1Date');
    if (day1DateInput) {
        day1DateInput.max = maxDate.toISOString().split('T')[0];
        day1DateInput.value = maxDate.toISOString().split('T')[0]; // Default to yesterday
        day1DateInput.addEventListener('change', function() {
            validateDate(this);
            updateMealDates(1);
        });
    }

    // Load saved data
    loadData();

    // Setup exclusive dropdown logic for top-two food items
    const topTwoGroups = [
        "cereal_milled", "cereal_whole", "pulses", "green_leafy", "other_veg",
        "roots_tubers", "fruits", "nuts_seeds", "milk_products", "meat_products",
        "sugary_bev", "confectionery", "fried_foods"
    ];
    topTwoGroups.forEach(group => setupTopTwoDropdowns(group));

    // Setup radio-to-radio conversion for food frequency
    enforceSingleSelectionPerRow();
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
        const inputs = row.querySelectorAll("input[type='checkbox']");
        inputs.forEach(cb => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = cb.name; // e.g., cereal_milled_freq
            radio.value = cb.value; // e.g., once_day
            radio.checked = cb.checked;
            cb.parentNode.replaceChild(radio, cb);
            radio.addEventListener('change', function() {
                console.log(`Radio changed: name=${this.name}, value=${this.value}, checked=${this.checked}`);
                const rowRadios = row.querySelectorAll(`input[name="${this.name}"]`);
                rowRadios.forEach(r => {
                    if (r !== this) r.checked = false;
                });
            });
        });
    });
    console.log("enforceSingleSelectionPerRow completed");
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

function validateDate(input) {
    const selectedDate = new Date(input.value);
    if (selectedDate > maxDate) {
        alert(`Please select a date up to ${maxDate.toISOString().split('T')[0]}. Future dates and today are not allowed.`);
        input.value = maxDate.toISOString().split('T')[0]; // Reset to yesterday
        return;
    }
}

function generateRows(mealTime, day) {
    const numItemsInput = document.getElementById(`numItems${day}_${mealTime}`);
    let numItems = parseInt(numItemsInput.value);
    if (isNaN(numItems)) numItems = 1;
    numItemsInput.value = numItems;
    const tableId = `mealRecallTableDay${day}_${mealTime}`;
    const tableBody = document.getElementById(tableId).getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    if (numItems >= 0) {
        for (let i = 0; i < numItems; i++) {
            const row = tableBody.insertRow();
            const dayPrefix = '1';
            row.innerHTML = `
                <td><input type="date" name="recallDate${dayPrefix}_${mealTime}" value="" disabled></td>
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
    updateMealDates(day);
}

function updateMealDates(day) {
    const dateInput = document.getElementById('day1Date');
    if (dateInput) {
        const date = dateInput.value;
        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        mealTimes.forEach(mealTime => {
            const tableId = `mealRecallTableDay${day}_${mealTime}`;
            const table = document.getElementById(tableId);
            if (table) {
                const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                for (let row of rows) {
                    const dateInput = row.getElementsByTagName('input')[0];
                    if (dateInput && dateInput.type === 'date') {
                        dateInput.value = date;
                    }
                }
            }
        });
    }
}

function calculateBMI() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value) / 100;
    const bmiInput = document.getElementById('bmi');
    if (weight > 0 && height > 0) {
        const bmi = weight / (height * height);
        bmiInput.value = bmi.toFixed(2);
        saveData();
    } else {
        bmiInput.value = '';
        alert('Please enter valid weight and height.');
    }
    window.scrollTo({ top: window.scrollY, behavior: 'auto' });
}

function saveData() {
    const formData = {
        submissions: {
            name: document.getElementById('name').value,
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value,
            education: document.getElementById('education').value,
            occupation: document.getElementById('occupation').value,
            income_level: document.getElementById('income').value,
            weight: document.getElementById('weight').value,
            height: document.getElementById('height').value,
            bmi: document.getElementById('bmi').value
        },
        dietary_preferences: {
            myplate: document.querySelector('input[name="myplate"]:checked')?.value || 'no',
            foodpyramid: document.querySelector('input[name="foodpyramid"]:checked')?.value || 'no',
            dietaryguidelines: document.querySelector('input[name="dietaryguidelines"]:checked')?.value || 'no',
            learn_source: document.querySelector('input[name="learn_source"]:checked')?.value || '',
            myplate_includes: document.getElementById('myplate_includes').value || '',
            balancedmeals: document.querySelector('input[name="balancedmeals"]:checked')?.value || 'no',
            foodgroups: document.querySelector('input[name="foodgroups"]:checked')?.value || 'no',
            foodgroups_list: document.getElementById('foodgroups_list').value || '',
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
            cereal_milled_highest: document.querySelector('select[name="cereal_milled_highest"]').value || '',
            cereal_milled_second: document.querySelector('select[name="cereal_milled_second"]').value || '',
            cereal_whole_highest: document.querySelector('select[name="cereal_whole_highest"]').value || '',
            cereal_whole_second: document.querySelector('select[name="cereal_whole_second"]').value || '',
            pulses_highest: document.querySelector('select[name="pulses_highest"]').value || '',
            pulses_second: document.querySelector('select[name="pulses_second"]').value || '',
            green_leafy_highest: document.querySelector('select[name="green_leafy_highest"]').value || '',
            green_leafy_second: document.querySelector('select[name="green_leafy_second"]').value || '',
            other_veg_highest: document.querySelector('select[name="other_veg_highest"]').value || '',
            other_veg_second: document.querySelector('select[name="other_veg_second"]').value || '',
            roots_tubers_highest: document.querySelector('select[name="roots_tubers_highest"]').value || '',
            roots_tubers_second: document.querySelector('select[name="roots_tubers_second"]').value || '',
            fruits_highest: document.querySelector('select[name="fruits_highest"]').value || '',
            fruits_second: document.querySelector('select[name="fruits_second"]').value || '',
            nuts_seeds_highest: document.querySelector('select[name="nuts_seeds_highest"]').value || '',
            nuts_seeds_second: document.querySelector('select[name="nuts_seeds_second"]').value || '',
            milk_products_highest: document.querySelector('select[name="milk_products_highest"]').value || '',
            milk_products_second: document.querySelector('select[name="milk_products_second"]').value || '',
            meat_products_highest: document.querySelector('select[name="meat_products_highest"]').value || '',
            meat_products_second: document.querySelector('select[name="meat_products_second"]').value || '',
            sugary_bev_highest: document.querySelector('select[name="sugary_bev_highest"]').value || '',
            sugary_bev_second: document.querySelector('select[name="sugary_bev_second"]').value || '',
            confectionery_highest: document.querySelector('select[name="confectionery_highest"]').value || '',
            confectionery_second: document.querySelector('select[name="confectionery_second"]').value || '',
            fried_foods_highest: document.querySelector('select[name="fried_foods_highest"]').value || '',
            fried_foods_second: document.querySelector('select[name="fried_foods_second"]').value || ''
        },
        meal_items: {
            recall1: [],
            items1: {},
            quantities1: {},
            units1: {}
        }
    };

    const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    mealTimes.forEach(mealTime => {
        const dateInputs1 = document.querySelectorAll(`input[name="recallDate1_${mealTime}"]`);
        const day1Date = document.getElementById('day1Date')?.value || null;
        formData.meal_items.recall1.push(dateInputs1.length && day1Date ? day1Date : null);
        formData.meal_items.items1[mealTime] = Array.from(document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items.quantities1[mealTime] = Array.from(document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items.units1[mealTime] = Array.from(document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)).map(select => select?.value || '');
    });

    console.log("Saving food_frequency:", formData.food_frequency);
    localStorage.setItem('dietFormData', JSON.stringify(formData));
}

async function submitForm(event) {
    event.preventDefault();

    const formData = {
        submissions: {
            name: document.getElementById('name')?.value || '',
            age: document.getElementById('age')?.value || '',
            gender: document.getElementById('gender')?.value || '',
            education: document.getElementById('education')?.value || '',
            occupation: document.getElementById('occupation')?.value || '',
            income_level: document.getElementById('income')?.value || '',
            weight: document.getElementById('weight')?.value || '',
            height: document.getElementById('height')?.value || '',
            bmi: document.getElementById('bmi')?.value || ''
        },
        dietary_preferences: {
            myplate: document.querySelector('input[name="myplate"]:checked')?.value || 'no',
            foodpyramid: document.querySelector('input[name="foodpyramid"]:checked')?.value || 'no',
            dietaryguidelines: document.querySelector('input[name="dietaryguidelines"]:checked')?.value || 'no',
            learn_source: document.querySelector('input[name="learn_source"]:checked')?.value || '',
            myplate_includes: document.getElementById('myplate_includes')?.value || '',
            balancedmeals: document.querySelector('input[name="balancedmeals"]:checked')?.value || 'no',
            foodgroups: document.querySelector('input[name="foodgroups"]:checked')?.value || 'no',
            foodgroups_list: document.getElementById('foodgroups_list')?.value || '',
            servings: document.querySelector('input[name="servings"]:checked')?.value || 'no',
            foodpyramid_base: document.querySelector('input[name="foodpyramid_base"]:checked')?.value || '',
            preference_reason: document.querySelector('input[name="preference_reason"]:checked')?.value || '',
            barrier: document.querySelector('input[name="barrier"]:checked')?.value || '',
            practical: document.querySelector('input[name="practical"]:checked')?.value || '',
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
            recall1: [],
            items1: {},
            quantities1: {},
            units1: {}
        }
    };

    const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    const day1Date = document.getElementById('day1Date')?.value || null;

    // Validate day1Date if meal items are present
    const hasMealItems = mealTimes.some(mealTime => {
        const items = Array.from(document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)).map(input => input?.value || '');
        return items.some(item => item.trim() !== '');
    });
    if (hasMealItems && !day1Date) {
        alert('Please select a valid date for Day 1 meal recall.');
        return;
    }

    mealTimes.forEach(mealTime => {
        const dateInputs1 = document.querySelectorAll(`input[name="recallDate1_${mealTime}"]`);
        formData.meal_items.recall1.push(dateInputs1.length && day1Date ? day1Date : null);
        formData.meal_items.items1[mealTime] = Array.from(document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items.quantities1[mealTime] = Array.from(document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items.units1[mealTime] = Array.from(document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)).map(select => select?.value || '');
    });

    console.log("Submitting food_frequency:", formData.food_frequency);
    calculateBMI();
    try {
        console.log('Sending formData:', JSON.stringify(formData, null, 2));
        const response = await fetch('http://localhost:5000/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: formData }),
        });
        console.log('Response status:', response.status, 'Redirected:', response.redirected);
        if (response.redirected) {
            console.log('Redirecting to:', response.url);
            return;
        }
        const result = await response.json();
        if (response.ok) {
            alert('Data submitted successfully!');
            loadData();
        } else {
            throw new Error(result.message || 'Failed to save data to server');
        }
    } catch (error) {
        console.error('Error saving data:', error.message);
        alert('Error saving data: ' + error.message);
    }
}

function loadData() {
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    if (savedData && Object.keys(savedData).length > 0) {
        document.getElementById('name').value = savedData.submissions.name || '';
        document.getElementById('age').value = savedData.submissions.age || '';
        document.getElementById('gender').value = savedData.submissions.gender || '';
        document.getElementById('education').value = savedData.submissions.education || '';
        document.getElementById('occupation').value = savedData.submissions.occupation || '';
        document.getElementById('income').value = savedData.submissions.income_level || '';
        document.getElementById('weight').value = savedData.submissions.weight || '';
        document.getElementById('height').value = savedData.submissions.height || '';
        document.getElementById('bmi').value = savedData.submissions.bmi || '';
        const myplateRadio = document.querySelector(`input[name="myplate"][value="${savedData.dietary_preferences.myplate || ''}"]`);
        if (myplateRadio) myplateRadio.checked = true;
        const foodpyramidRadio = document.querySelector(`input[name="foodpyramid"][value="${savedData.dietary_preferences.foodpyramid || ''}"]`);
        if (foodpyramidRadio) foodpyramidRadio.checked = true;
        const dietaryguidelinesRadio = document.querySelector(`input[name="dietaryguidelines"][value="${savedData.dietary_preferences.dietaryguidelines || ''}"]`);
        if (dietaryguidelinesRadio) dietaryguidelinesRadio.checked = true;
        const learnSourceRadio = document.querySelector(`input[name="learn_source"][value="${savedData.dietary_preferences.learn_source || ''}"]`);
        if (learnSourceRadio) learnSourceRadio.checked = true;
        document.getElementById('myplate_includes').value = savedData.dietary_preferences.myplate_includes || '';
        const balancedmealsRadio = document.querySelector(`input[name="balancedmeals"][value="${savedData.dietary_preferences.balancedmeals || ''}"]`);
        if (balancedmealsRadio) balancedmealsRadio.checked = true;
        const foodgroupsRadio = document.querySelector(`input[name="foodgroups"][value="${savedData.dietary_preferences.foodgroups || ''}"]`);
        if (foodgroupsRadio) foodgroupsRadio.checked = true;
        document.getElementById('foodgroups_list').value = savedData.dietary_preferences.foodgroups_list || '';
        const servingsRadio = document.querySelector(`input[name="servings"][value="${savedData.dietary_preferences.servings || ''}"]`);
        if (servingsRadio) servingsRadio.checked = true;
        const foodpyramidBaseRadio = document.querySelector(`input[name="foodpyramid_base"][value="${savedData.dietary_preferences.foodpyramid_base || ''}"]`);
        if (foodpyramidBaseRadio) foodpyramidBaseRadio.checked = true;
        const preferenceReasonRadio = document.querySelector(`input[name="preference_reason"][value="${savedData.dietary_preferences.preference_reason || ''}"]`);
        if (preferenceReasonRadio) preferenceReasonRadio.checked = true;
        const barrierRadio = document.querySelector(`input[name="barrier"][value="${savedData.dietary_preferences.barrier || ''}"]`);
        if (barrierRadio) barrierRadio.checked = true;
        const practicalRadio = document.querySelector(`input[name="practical"][value="${savedData.dietary_preferences.practical || ''}"]`);
        if (practicalRadio) practicalRadio.checked = true;
        const dietTypeRadio = document.querySelector(`input[name="diet_type"][value="${savedData.dietary_preferences.diet_type || ''}"]`);
        if (dietTypeRadio) dietTypeRadio.checked = true;
        const awarePhysicalRadio = document.querySelector(`input[name="aware_physical"][value="${savedData.physical_activity.aware_physical || ''}"]`);
        if (awarePhysicalRadio) awarePhysicalRadio.checked = true;
        const engageDailyRadio = document.querySelector(`input[name="engage_daily"][value="${savedData.physical_activity.engage_daily || ''}"]`);
        if (engageDailyRadio) engageDailyRadio.checked = true;
        const activityTypeRadio = document.querySelector(`input[name="activity_type"][value="${savedData.physical_activity.activity_type || ''}"]`);
        if (activityTypeRadio) activityTypeRadio.checked = true;
        const durationRadio = document.querySelector(`input[name="duration"][value="${savedData.physical_activity.duration || ''}"]`);
        if (durationRadio) durationRadio.checked = true;
        const frequencyRadio = document.querySelector(`input[name="frequency"][value="${savedData.physical_activity.frequency || ''}"]`);
        if (frequencyRadio) frequencyRadio.checked = true;
        
        // Food Frequency
        const foodFrequencyFields = [
            'cereal_milled', 'cereal_whole', 'pulses', 'green_leafy', 'other_veg',
            'roots_tubers', 'fruits', 'nuts_seeds', 'milk_products', 'meat_products',
            'sugars', 'fried_foods', 'sugary_bev', 'packaged_snacks', 'pizzas_burgers',
            'confectionery'
        ];
        foodFrequencyFields.forEach(field => {
            const value = savedData.food_frequency[field] || '';
            const radio = document.querySelector(`input[name="${field}_freq"][value="${value}"]`);
            if (radio) {
                radio.checked = true;
                console.log(`Loaded ${field}_freq: value=${value}, checked=${radio.checked}`);
            } else if (value) {
                console.warn(`No radio button found for ${field}_freq with value=${value}`);
            }
        });

        document.querySelector('select[name="cereal_milled_highest"]').value = savedData.top_two_items.cereal_milled_highest || '';
        document.querySelector('select[name="cereal_milled_second"]').value = savedData.top_two_items.cereal_milled_second || '';
        document.querySelector('select[name="cereal_whole_highest"]').value = savedData.top_two_items.cereal_whole_highest || '';
        document.querySelector('select[name="cereal_whole_second"]').value = savedData.top_two_items.cereal_whole_second || '';
        document.querySelector('select[name="pulses_highest"]').value = savedData.top_two_items.pulses_highest || '';
        document.querySelector('select[name="pulses_second"]').value = savedData.top_two_items.pulses_second || '';
        document.querySelector('select[name="green_leafy_highest"]').value = savedData.top_two_items.green_leafy_highest || '';
        document.querySelector('select[name="green_leafy_second"]').value = savedData.top_two_items.green_leafy_second || '';
        document.querySelector('select[name="other_veg_highest"]').value = savedData.top_two_items.other_veg_highest || '';
        document.querySelector('select[name="other_veg_second"]').value = savedData.top_two_items.other_veg_second || '';
        document.querySelector('select[name="roots_tubers_highest"]').value = savedData.top_two_items.roots_tubers_highest || '';
        document.querySelector('select[name="roots_tubers_second"]').value = savedData.top_two_items.roots_tubers_second || '';
        document.querySelector('select[name="fruits_highest"]').value = savedData.top_two_items.fruits_highest || '';
        document.querySelector('select[name="fruits_second"]').value = savedData.top_two_items.fruits_second || '';
        document.querySelector('select[name="nuts_seeds_highest"]').value = savedData.top_two_items.nuts_seeds_highest || '';
        document.querySelector('select[name="nuts_seeds_second"]').value = savedData.top_two_items.nuts_seeds_second || '';
        document.querySelector('select[name="milk_products_highest"]').value = savedData.top_two_items.milk_products_highest || '';
        document.querySelector('select[name="milk_products_second"]').value = savedData.top_two_items.milk_products_second || '';
        document.querySelector('select[name="meat_products_highest"]').value = savedData.top_two_items.meat_products_highest || '';
        document.querySelector('select[name="meat_products_second"]').value = savedData.top_two_items.meat_products_second || '';
        document.querySelector('select[name="sugary_bev_highest"]').value = savedData.top_two_items.sugary_bev_highest || '';
        document.querySelector('select[name="sugary_bev_second"]').value = savedData.top_two_items.sugary_bev_second || '';
        document.querySelector('select[name="confectionery_highest"]').value = savedData.top_two_items.confectionery_highest || '';
        document.querySelector('select[name="confectionery_second"]').value = savedData.top_two_items.confectionery_second || '';
        document.querySelector('select[name="fried_foods_highest"]').value = savedData.top_two_items.fried_foods_highest || '';
        document.querySelector('select[name="fried_foods_second"]').value = savedData.top_two_items.fried_foods_second || '';

        // Regenerate rows with saved data
        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        mealTimes.forEach(mealTime => {
            if (savedData.meal_items && savedData.meal_items.items1 && savedData.meal_items.items1[mealTime]) {
                document.getElementById('day1Date').value = savedData.meal_items.recall1[0] || maxDate.toISOString().split('T')[0];
                document.getElementById(`numItems1_${mealTime}`).value = savedData.meal_items.items1[mealTime].length || 0;
                generateRows(mealTime, 1);
                savedData.meal_items.items1[mealTime].forEach((item, index) => {
                    if (document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)[index].value = item || '';
                    }
                });
                savedData.meal_items.quantities1[mealTime].forEach((qty, index) => {
                    if (document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)[index].value = qty || '0';
                    }
                });
                savedData.meal_items.units1[mealTime].forEach((unit, index) => {
                    if (document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)[index].value = unit || 'cups';
                    }
                });
            }
        });
    }
}