// Define maxDate globally
const today = new Date();
const maxDate = new Date(today);
maxDate.setDate(today.getDate() - 1); // Yesterday

document.addEventListener('DOMContentLoaded', () => {
    // Clear localStorage on refresh to reset form
    localStorage.removeItem('dietFormData');
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
            // Remove default min validation to allow 0
            numItems.removeAttribute('min');
        }
    });

    // Ensure BMI button works with event listener and prevent form submission
    const calcBMIBtn = document.getElementById('calcBMIBtn');
    if (calcBMIBtn) {
        calcBMIBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent any form submission
            calculateBMI();
        });
    }

    // Date validation setup for top-level date pickers (past dates, excluding today and future)
    const dateInputs = [document.getElementById('day1Date'), document.getElementById('day2Date')];
    dateInputs.forEach(input => {
        if (input) {
            input.max = maxDate.toISOString().split('T')[0];
            input.value = maxDate.toISOString().split('T')[0]; // Default to yesterday
            input.addEventListener('change', function() {
                validateDate(this);
                updateMealDates(this.id === 'day1Date' ? 1 : 2);
            });
        }
    });

    // Load saved data (now empty on fresh load)
    loadData();

    // Add toggle for Day-2 section
    const day2Toggle = document.createElement('button');
    day2Toggle.id = 'day2Toggle';
    day2Toggle.textContent = 'Fill Day-2 Recall';
    day2Toggle.addEventListener('click', () => {
        const day2Section = document.getElementById('day2Section');
        if (day2Section) {
            const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
            const day1Date = new Date(savedData.meal_items?.recall1?.[0] || '');
            const minDay2Date = new Date(day1Date);
            minDay2Date.setDate(day1Date.getDate() + 2);
            const today = new Date();
            if (today >= minDay2Date && !isNaN(day1Date.getTime())) {
                day2Section.style.display = day2Section.style.display === 'none' ? 'block' : 'none';
            } else {
                alert(`Day-2 can only be filled starting ${minDay2Date.toISOString().split('T')[0]}. Please set a valid Day-1 date first.`);
            }
        }
    });
    document.body.appendChild(day2Toggle);

    // Setup exclusive dropdown logic for top-two food items
    const topTwoGroups = [
        "cereal_milled", "cereal_whole", "pulses", "green_leafy", "other_veg",
        "roots_tubers", "fruits", "nuts_seeds", "milk_products", "meat_products",
        "sugary_bev", "confectionery", "fried_foods"
    ];
    topTwoGroups.forEach(group => setupTopTwoDropdowns(group));

    // Setup radio-to-radio conversion for food frequency checkboxes
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
    const table = document.querySelector("section h2:contains('Food Frequency Questionnaire')")?.closest("section").querySelector("table");
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row, rowIndex) => {
        const inputs = row.querySelectorAll("input[type='checkbox']");
        inputs.forEach(cb => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `food_freq_row_${rowIndex}`; // Unique name per row
            radio.value = cb.value;
            radio.checked = cb.checked;
            cb.parentNode.replaceChild(radio, cb);
            radio.addEventListener('change', function() {
                const rowRadios = this.parentNode.parentNode.querySelectorAll('input[type="radio"]');
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
    console.log('Checked:', { myplateYes, foodpyramidYes, dietaryguidelinesYes }); // Debug log
}

function validateDate(input) {
    const selectedDate = new Date(input.value);
    const today = new Date();
    const maxDate = new Date(today); // Redefine maxDate here for this function's scope
    maxDate.setDate(today.getDate() - 1); // Yesterday
    const dayPrefix = input.id === 'day2Date' ? '2' : '1';
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    const day1Date = savedData.meal_items?.recall1?.[0] ? new Date(savedData.meal_items.recall1[0]) : null;

    if (dayPrefix === '2' && day1Date) {
        const minDay2Date = new Date(day1Date);
        minDay2Date.setDate(day1Date.getDate() + 2); // Earliest non-consecutive day
        if (selectedDate < minDay2Date || selectedDate > maxDate) {
            alert(`Please select a date between ${minDay2Date.toISOString().split('T')[0]} and ${maxDate.toISOString().split('T')[0]} for Day-${dayPrefix}.`);
            input.value = minDay2Date <= maxDate ? minDay2Date.toISOString().split('T')[0] : maxDate.toISOString().split('T')[0];
            return;
        }
    } else if (selectedDate > maxDate) {
        alert(`Please select a date up to ${maxDate.toISOString().split('T')[0]}. Future dates and today are not allowed.`);
        input.value = maxDate.toISOString().split('T')[0]; // Reset to yesterday
        return;
    }
}

function generateRows(mealTime, day) {
    const numItemsInput = document.getElementById(`numItems${day}_${mealTime}`);
    let numItems = parseInt(numItemsInput.value);
    if (isNaN(numItems)) numItems = 1; // Default to 1 if not a number
    numItemsInput.value = numItems; // Ensure input reflects valid value
    const tableId = `mealRecallTableDay${day}_${mealTime}`;
    const tableBody = document.getElementById(tableId).getElementsByTagName('tbody')[0];

    // Clear existing rows
    tableBody.innerHTML = '';

    // Generate new rows based on numItems, allowing 0 to clear rows
    const today = new Date();
    const maxDate = new Date(today); // Redefine maxDate here for this function's scope
    maxDate.setDate(today.getDate() - 1); // Yesterday
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    const day1Date = savedData.meal_items?.recall1?.[0] ? new Date(savedData.meal_items.recall1[0]) : null;
    const minDay2Date = day === 2 && day1Date ? new Date(day1Date) : null;
    if (minDay2Date) minDay2Date.setDate(day1Date.getDate() + 2);

    if (numItems >= 0) {
        for (let i = 0; i < numItems; i++) {
            const row = tableBody.insertRow();
            const dayPrefix = day === 2 ? '2' : '1';
            row.innerHTML = `
                <td><input type="date" name="recallDate${dayPrefix}_${mealTime}" value="" disabled></td>
                <td><input type="text" name="item${dayPrefix}_${mealTime}[]"></td>
                <td><input type="number" name="quantity${dayPrefix}_${mealTime}[]" step="0.1" min="0" value="0"></td>
                <td>
                    <select name="unit${dayPrefix}_${mealTime}[]">
                        <option value="cups">Cups</option>
                        <option value="tablespoons">Tablespoons</option>
                        <option value="teaspoons">Teaspoons</option>
                        <option value="pieces">Pieces</option>
                    </select>
                </td>
            `;
        }
    }
    console.log(`Generated ${numItems} rows for ${mealTime}, Day ${day}`); // Debug log
    updateMealDates(day); // Update dates after row generation
}

function updateMealDates(day) {
    const dateInput = day === 1 ? document.getElementById('day1Date') : document.getElementById('day2Date');
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
    const height = parseFloat(document.getElementById('height').value) / 100; // Convert cm to meters
    const bmiInput = document.getElementById('bmi');
    if (weight > 0 && height > 0) {
        const bmi = weight / (height * height);
        bmiInput.value = bmi.toFixed(2);
    } else {
        bmiInput.value = '';
        alert('Please enter valid weight and height.');
    }
    console.log('BMI calculated:', bmiInput.value); // Debug log
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
        },
        meal_items2: {
            recall2: [],
            items2: {},
            quantities2: {},
            units2: {}
        }
    };

    const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    mealTimes.forEach(mealTime => {
        const dateInputs1 = document.querySelectorAll(`input[name="recallDate1_${mealTime}"]`);
        formData.meal_items.recall1.push(dateInputs1.length ? document.getElementById('day1Date').value : '');
        formData.meal_items.items1[mealTime] = Array.from(document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items.quantities1[mealTime] = Array.from(document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items.units1[mealTime] = Array.from(document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)).map(select => select?.value || '');

        const dateInputs2 = document.querySelectorAll(`input[name="recallDate2_${mealTime}"]`);
        formData.meal_items2.recall2.push(dateInputs2.length ? document.getElementById('day2Date').value : '');
        formData.meal_items2.items2[mealTime] = Array.from(document.querySelectorAll(`input[name="item2_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items2.quantities2[mealTime] = Array.from(document.querySelectorAll(`input[name="quantity2_${mealTime}[]"]`)).map(input => input?.value || '');
        formData.meal_items2.units2[mealTime] = Array.from(document.querySelectorAll(`select[name="unit2_${mealTime}[]"]`)).map(select => select?.value || '');
    });

    localStorage.setItem('dietFormData', JSON.stringify(formData));
    alert('Data saved successfully!');
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
        },
        meal_items2: {
            recall2: [],
            items2: {},
            quantities2: {},
            units2: {}
        }
    };

    const isDay1Page = document.getElementById('day1Form') !== null; // Adjust based on your HTML IDs
    const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    if (isDay1Page) {
        mealTimes.forEach(mealTime => {
            const dateInputs1 = document.querySelectorAll(`input[name="recallDate1_${mealTime}"]`);
            formData.meal_items.recall1.push(dateInputs1.length ? document.getElementById('day1Date')?.value || '' : '');
            formData.meal_items.items1[mealTime] = Array.from(document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)).map(input => input?.value || '');
            formData.meal_items.quantities1[mealTime] = Array.from(document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)).map(input => input?.value || '');
            formData.meal_items.units1[mealTime] = Array.from(document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)).map(select => select?.value || '');
        });
    } else {
        mealTimes.forEach(mealTime => {
            const dateInputs2 = document.querySelectorAll(`input[name="recallDate2_${mealTime}"]`);
            formData.meal_items2.recall2.push(dateInputs2.length ? document.getElementById('day2Date')?.value || '' : '');
            formData.meal_items2.items2[mealTime] = Array.from(document.querySelectorAll(`input[name="item2_${mealTime}[]"]`)).map(input => input?.value || '');
            formData.meal_items2.quantities2[mealTime] = Array.from(document.querySelectorAll(`input[name="quantity2_${mealTime}[]"]`)).map(input => input?.value || '');
            formData.meal_items2.units2[mealTime] = Array.from(document.querySelectorAll(`select[name="unit2_${mealTime}[]"]`)).map(select => select?.value || '');
        });
    }

    calculateBMI();
    try {
        const response = await fetch('http://localhost:5000/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: formData }),
        });
        if (response.redirected) {
            // If the server redirected, let the browser handle it
            console.log('Redirecting to:', response.url);
            return; // Exit the function to avoid further processing
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
        const cerealMilledRadio = document.querySelector(`input[name="cereal_milled_freq"][value="${savedData.food_frequency.cereal_milled || ''}"]`);
        if (cerealMilledRadio) cerealMilledRadio.checked = true;
        const cerealWholeRadio = document.querySelector(`input[name="cereal_whole_freq"][value="${savedData.food_frequency.cereal_whole || ''}"]`);
        if (cerealWholeRadio) cerealWholeRadio.checked = true;
        const pulsesRadio = document.querySelector(`input[name="pulses_freq"][value="${savedData.food_frequency.pulses || ''}"]`);
        if (pulsesRadio) pulsesRadio.checked = true;
        const greenLeafyRadio = document.querySelector(`input[name="green_leafy_freq"][value="${savedData.food_frequency.green_leafy || ''}"]`);
        if (greenLeafyRadio) greenLeafyRadio.checked = true;
        const otherVegRadio = document.querySelector(`input[name="other_veg_freq"][value="${savedData.food_frequency.other_veg || ''}"]`);
        if (otherVegRadio) otherVegRadio.checked = true;
        const rootsTubersRadio = document.querySelector(`input[name="roots_tubers_freq"][value="${savedData.food_frequency.roots_tubers || ''}"]`);
        if (rootsTubersRadio) rootsTubersRadio.checked = true;
        const fruitsRadio = document.querySelector(`input[name="fruits_freq"][value="${savedData.food_frequency.fruits || ''}"]`);
        if (fruitsRadio) fruitsRadio.checked = true;
        const nutsSeedsRadio = document.querySelector(`input[name="nuts_seeds_freq"][value="${savedData.food_frequency.nuts_seeds || ''}"]`);
        if (nutsSeedsRadio) nutsSeedsRadio.checked = true;
        const milkProductsRadio = document.querySelector(`input[name="milk_products_freq"][value="${savedData.food_frequency.milk_products || ''}"]`);
        if (milkProductsRadio) milkProductsRadio.checked = true;
        const meatProductsRadio = document.querySelector(`input[name="meat_products_freq"][value="${savedData.food_frequency.meat_products || ''}"]`);
        if (meatProductsRadio) meatProductsRadio.checked = true;
        const sugarsRadio = document.querySelector(`input[name="sugars_freq"][value="${savedData.food_frequency.sugars || ''}"]`);
        if (sugarsRadio) sugarsRadio.checked = true;
        const friedFoodsRadio = document.querySelector(`input[name="fried_foods_freq"][value="${savedData.food_frequency.fried_foods || ''}"]`);
        if (friedFoodsRadio) friedFoodsRadio.checked = true;
        const sugaryBevRadio = document.querySelector(`input[name="sugary_bev_freq"][value="${savedData.food_frequency.sugary_bev || ''}"]`);
        if (sugaryBevRadio) sugaryBevRadio.checked = true;
        const packagedSnacksRadio = document.querySelector(`input[name="packaged_snacks_freq"][value="${savedData.food_frequency.packaged_snacks || ''}"]`);
        if (packagedSnacksRadio) packagedSnacksRadio.checked = true;
        const pizzasBurgersRadio = document.querySelector(`input[name="pizzas_burgers_freq"][value="${savedData.food_frequency.pizzas_burgers || ''}"]`);
        if (pizzasBurgersRadio) pizzasBurgersRadio.checked = true;
        const confectioneryRadio = document.querySelector(`input[name="confectionery_freq"][value="${savedData.food_frequency.confectionery || ''}"]`);
        if (confectioneryRadio) confectioneryRadio.checked = true;
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
                document.getElementById(`numItems1_${mealTime}`).value = savedData.meal_items.items1[mealTime].length || 0; // Allow 0 if no items
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

            // Load Day-2 only if data exists
            if (savedData.meal_items2 && savedData.meal_items2.items2 && savedData.meal_items2.items2[mealTime]) {
                document.getElementById('day2Date').value = savedData.meal_items2.recall2[0] || maxDate.toISOString().split('T')[0];
                document.getElementById(`numItems2_${mealTime}`).value = savedData.meal_items2.items2[mealTime].length || 0;
                generateRows(mealTime, 2);
                savedData.meal_items2.items2[mealTime].forEach((item, index) => {
                    if (document.querySelectorAll(`input[name="item2_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`input[name="item2_${mealTime}[]"]`)[index].value = item || '';
                    }
                });
                savedData.meal_items2.quantities2[mealTime].forEach((qty, index) => {
                    if (document.querySelectorAll(`input[name="quantity2_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`input[name="quantity2_${mealTime}[]"]`)[index].value = qty || '0';
                    }
                });
                savedData.meal_items2.units2[mealTime].forEach((unit, index) => {
                    if (document.querySelectorAll(`select[name="unit2_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`select[name="unit2_${mealTime}[]"]`)[index].value = unit || 'cups';
                    }
                });
            } else {
                document.getElementById(`numItems2_${mealTime}`).value = 0;
                generateRows(mealTime, 2);
            }
        });

        // Hide Day-2 section initially and show only if Day-2 data exists or condition is met
        const day2Section = document.getElementById('day2Section');
        if (day2Section) {
            const day1Date = new Date(savedData.meal_items.recall1?.[0] || '');
            const minDay2Date = new Date(day1Date);
            minDay2Date.setDate(day1Date.getDate() + 2);
            const today = new Date();
            day2Section.style.display = savedData.meal_items2.recall2?.[0] || (today >= minDay2Date && day1Date) ? 'block' : 'none';
        }
    }
}