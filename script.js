// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    checkFirstThree();
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (radio.checked && radio.getAttribute('onchange')) {
            toggleQuestion(radio, radio.getAttribute('onchange').split("'")[1]);
        }
    });

    // Initialize meal recall rows for all meal times
    const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    mealTimes.forEach(mealTime => {
        generateRows(mealTime, 1);
    });

    // Ensure BMI button works with event listener
    const calcBMIBtn = document.getElementById('calcBMIBtn');
    if (calcBMIBtn) {
        calcBMIBtn.addEventListener('click', calculateBMI);
    }

    // Date validation setup
    const maxDate = new Date('2025-04-13').toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.max = maxDate;
        input.addEventListener('change', function() {
            validateDate(this);
        });
    });

    // Load saved data
    loadData();
});

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

function toggleQuestion(radio, targetId) {
    const target = document.getElementById(targetId);
    if (target) {
        target.style.display = radio.value === "yes" ? "block" : "none";
    }
}

function validateDate(input) {
    const selectedDate = new Date(input.value);
    const maxDate = new Date('2025-04-13');
    if (selectedDate > maxDate) {
        alert("Future dates beyond April 13, 2025, are not allowed.");
        input.value = '';
        return;
    }
}

function generateRows(mealTime, day) {
    const numItemsInput = document.getElementById(`numItems${day}_${mealTime}`);
    let numItems = parseInt(numItemsInput.value);
    if (isNaN(numItems) || numItems < 1) numItems = 1;
    numItemsInput.value = numItems; // Ensure input reflects valid value
    const tableId = `mealRecallTableDay${day}_${mealTime}`;
    const tableBody = document.getElementById(tableId).getElementsByTagName('tbody')[0];

    // Clear existing rows
    tableBody.innerHTML = '';

    // Generate new rows
    for (let i = 0; i < numItems; i++) {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td><input type="date" name="recallDate${day}_${mealTime}" onchange="validateDate(this)" max="2025-04-13"></td>
            <td><input type="text" name="item${day}_${mealTime}[]"></td>
            <td><input type="number" name="quantity${day}_${mealTime}[]" step="0.1"></td>
            <td>
                <select name="unit${day}_${mealTime}[]">
                    <option value="cups">Cups</option>
                    <option value="tablespoons">Tablespoons</option>
                    <option value="teaspoons">Teaspoons</option>
                    <option value="pieces">Pieces</option>
                </select>
            </td>
        `;
    }
    console.log(`Generated ${numItems} rows for ${mealTime}, Day ${day}`); // Debug log
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
        name: document.getElementById('name').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        education: document.getElementById('education').value,
        occupation: document.getElementById('occupation').value,
        income: document.getElementById('income').value,
        weight: document.getElementById('weight').value,
        height: document.getElementById('height').value,
        bmi: document.getElementById('bmi').value,
        myplate: document.querySelector('input[name="myplate"]:checked')?.value,
        foodpyramid: document.querySelector('input[name="foodpyramid"]:checked')?.value,
        dietaryguidelines: document.querySelector('input[name="dietaryguidelines"]:checked')?.value,
        learn_source: document.querySelector('input[name="learn_source"]:checked')?.value,
        myplate_includes: document.getElementById('myplate_includes').value,
        balancedmeals: document.querySelector('input[name="balancedmeals"]:checked')?.value,
        foodgroups: document.querySelector('input[name="foodgroups"]:checked')?.value,
        foodgroups_list: document.getElementById('foodgroups_list').value,
        servings: document.querySelector('input[name="servings"]:checked')?.value,
        foodpyramid_base: document.querySelector('input[name="foodpyramid_base"]:checked')?.value,
        preference_reason: document.querySelector('input[name="preference_reason"]:checked')?.value,
        barrier: document.querySelector('input[name="barrier"]:checked')?.value,
        practical: document.querySelector('input[name="practical"]:checked')?.value,
        diet_type: document.querySelector('input[name="diet_type"]:checked')?.value,
        aware_physical: document.querySelector('input[name="aware_physical"]:checked')?.value,
        engage_daily: document.querySelector('input[name="engage_daily"]:checked')?.value,
        activity_type: document.querySelector('input[name="activity_type"]:checked')?.value,
        duration: document.querySelector('input[name="duration"]:checked')?.value,
        frequency: document.querySelector('input[name="frequency"]:checked')?.value,
        cereal_milled_highest: document.querySelector('select[name="cereal_milled_highest"]').value,
        cereal_milled_second: document.querySelector('select[name="cereal_milled_second"]').value,
        cereal_whole_highest: document.querySelector('select[name="cereal_whole_highest"]').value,
        cereal_whole_second: document.querySelector('select[name="cereal_whole_second"]').value,
        pulses_highest: document.querySelector('select[name="pulses_highest"]').value,
        pulses_second: document.querySelector('select[name="pulses_second"]').value,
        green_leafy_highest: document.querySelector('select[name="green_leafy_highest"]').value,
        green_leafy_second: document.querySelector('select[name="green_leafy_second"]').value,
        other_veg_highest: document.querySelector('select[name="other_veg_highest"]').value,
        other_veg_second: document.querySelector('select[name="other_veg_second"]').value,
        roots_tubers_highest: document.querySelector('select[name="roots_tubers_highest"]').value,
        roots_tubers_second: document.querySelector('select[name="roots_tubers_second"]').value,
        fruits_highest: document.querySelector('select[name="fruits_highest"]').value,
        fruits_second: document.querySelector('select[name="fruits_second"]').value,
        nuts_seeds_highest: document.querySelector('select[name="nuts_seeds_highest"]').value,
        nuts_seeds_second: document.querySelector('select[name="nuts_seeds_second"]').value,
        milk_products_highest: document.querySelector('select[name="milk_products_highest"]').value,
        milk_products_second: document.querySelector('select[name="milk_products_second"]').value,
        meat_products_highest: document.querySelector('select[name="meat_products_highest"]').value,
        meat_products_second: document.querySelector('select[name="meat_products_second"]').value,
        sugary_bev_highest: document.querySelector('select[name="sugary_bev_highest"]').value,
        sugary_bev_second: document.querySelector('select[name="sugary_bev_second"]').value,
        confectionery_highest: document.querySelector('select[name="confectionery_highest"]').value,
        confectionery_second: document.querySelector('select[name="confectionery_second"]').value,
        fried_foods_highest: document.querySelector('select[name="fried_foods_highest"]').value,
        fried_foods_second: document.querySelector('select[name="fried_foods_second"]').value,
        recall1: [],
        items1: {},
        quantities1: {},
        units1: {}
    };

    const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    mealTimes.forEach(mealTime => {
        formData.recall1.push(document.querySelector(`input[name="recallDate1_${mealTime}"]`)?.value || '');
        formData.items1[mealTime] = Array.from(document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)).map(input => input.value);
        formData.quantities1[mealTime] = Array.from(document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)).map(input => input.value);
        formData.units1[mealTime] = Array.from(document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)).map(select => select.value);
    });

    localStorage.setItem('dietFormData', JSON.stringify(formData));
    alert('Data saved successfully!');
}

function loadData() {
    const savedData = JSON.parse(localStorage.getItem('dietFormData') || '{}');
    if (savedData) {
        document.getElementById('name').value = savedData.name || '';
        document.getElementById('age').value = savedData.age || '';
        document.getElementById('gender').value = savedData.gender || '';
        document.getElementById('education').value = savedData.education || '';
        document.getElementById('occupation').value = savedData.occupation || '';
        document.getElementById('income').value = savedData.income || '';
        document.getElementById('weight').value = savedData.weight || '';
        document.getElementById('height').value = savedData.height || '';
        document.getElementById('bmi').value = savedData.bmi || '';
        const myplateRadio = document.querySelector(`input[name="myplate"][value="${savedData.myplate || ''}"]`);
        if (myplateRadio) myplateRadio.checked = true;
        const foodpyramidRadio = document.querySelector(`input[name="foodpyramid"][value="${savedData.foodpyramid || ''}"]`);
        if (foodpyramidRadio) foodpyramidRadio.checked = true;
        const dietaryguidelinesRadio = document.querySelector(`input[name="dietaryguidelines"][value="${savedData.dietaryguidelines || ''}"]`);
        if (dietaryguidelinesRadio) dietaryguidelinesRadio.checked = true;
        const learnSourceRadio = document.querySelector(`input[name="learn_source"][value="${savedData.learn_source || ''}"]`);
        if (learnSourceRadio) learnSourceRadio.checked = true;
        document.getElementById('myplate_includes').value = savedData.myplate_includes || '';
        const balancedmealsRadio = document.querySelector(`input[name="balancedmeals"][value="${savedData.balancedmeals || ''}"]`);
        if (balancedmealsRadio) balancedmealsRadio.checked = true;
        const foodgroupsRadio = document.querySelector(`input[name="foodgroups"][value="${savedData.foodgroups || ''}"]`);
        if (foodgroupsRadio) foodgroupsRadio.checked = true;
        document.getElementById('foodgroups_list').value = savedData.foodgroups_list || '';
        const servingsRadio = document.querySelector(`input[name="servings"][value="${savedData.servings || ''}"]`);
        if (servingsRadio) servingsRadio.checked = true;
        const foodpyramidBaseRadio = document.querySelector(`input[name="foodpyramid_base"][value="${savedData.foodpyramid_base || ''}"]`);
        if (foodpyramidBaseRadio) foodpyramidBaseRadio.checked = true;
        const preferenceReasonRadio = document.querySelector(`input[name="preference_reason"][value="${savedData.preference_reason || ''}"]`);
        if (preferenceReasonRadio) preferenceReasonRadio.checked = true;
        const barrierRadio = document.querySelector(`input[name="barrier"][value="${savedData.barrier || ''}"]`);
        if (barrierRadio) barrierRadio.checked = true;
        const practicalRadio = document.querySelector(`input[name="practical"][value="${savedData.practical || ''}"]`);
        if (practicalRadio) practicalRadio.checked = true;
        const dietTypeRadio = document.querySelector(`input[name="diet_type"][value="${savedData.diet_type || ''}"]`);
        if (dietTypeRadio) dietTypeRadio.checked = true;
        const awarePhysicalRadio = document.querySelector(`input[name="aware_physical"][value="${savedData.aware_physical || ''}"]`);
        if (awarePhysicalRadio) awarePhysicalRadio.checked = true;
        const engageDailyRadio = document.querySelector(`input[name="engage_daily"][value="${savedData.engage_daily || ''}"]`);
        if (engageDailyRadio) engageDailyRadio.checked = true;
        const activityTypeRadio = document.querySelector(`input[name="activity_type"][value="${savedData.activity_type || ''}"]`);
        if (activityTypeRadio) activityTypeRadio.checked = true;
        const durationRadio = document.querySelector(`input[name="duration"][value="${savedData.duration || ''}"]`);
        if (durationRadio) durationRadio.checked = true;
        const frequencyRadio = document.querySelector(`input[name="frequency"][value="${savedData.frequency || ''}"]`);
        if (frequencyRadio) frequencyRadio.checked = true;
        document.querySelector('select[name="cereal_milled_highest"]').value = savedData.cereal_milled_highest || '';
        document.querySelector('select[name="cereal_milled_second"]').value = savedData.cereal_milled_second || '';
        document.querySelector('select[name="cereal_whole_highest"]').value = savedData.cereal_whole_highest || '';
        document.querySelector('select[name="cereal_whole_second"]').value = savedData.cereal_whole_second || '';
        document.querySelector('select[name="pulses_highest"]').value = savedData.pulses_highest || '';
        document.querySelector('select[name="pulses_second"]').value = savedData.pulses_second || '';
        document.querySelector('select[name="green_leafy_highest"]').value = savedData.green_leafy_highest || '';
        document.querySelector('select[name="green_leafy_second"]').value = savedData.green_leafy_second || '';
        document.querySelector('select[name="other_veg_highest"]').value = savedData.other_veg_highest || '';
        document.querySelector('select[name="other_veg_second"]').value = savedData.other_veg_second || '';
        document.querySelector('select[name="roots_tubers_highest"]').value = savedData.roots_tubers_highest || '';
        document.querySelector('select[name="roots_tubers_second"]').value = savedData.roots_tubers_second || '';
        document.querySelector('select[name="fruits_highest"]').value = savedData.fruits_highest || '';
        document.querySelector('select[name="fruits_second"]').value = savedData.fruits_second || '';
        document.querySelector('select[name="nuts_seeds_highest"]').value = savedData.nuts_seeds_highest || '';
        document.querySelector('select[name="nuts_seeds_second"]').value = savedData.nuts_seeds_second || '';
        document.querySelector('select[name="milk_products_highest"]').value = savedData.milk_products_highest || '';
        document.querySelector('select[name="milk_products_second"]').value = savedData.milk_products_second || '';
        document.querySelector('select[name="meat_products_highest"]').value = savedData.meat_products_highest || '';
        document.querySelector('select[name="meat_products_second"]').value = savedData.meat_products_second || '';
        document.querySelector('select[name="sugary_bev_highest"]').value = savedData.sugary_bev_highest || '';
        document.querySelector('select[name="sugary_bev_second"]').value = savedData.sugary_bev_second || '';
        document.querySelector('select[name="confectionery_highest"]').value = savedData.confectionery_highest || '';
        document.querySelector('select[name="confectionery_second"]').value = savedData.confectionery_second || '';
        document.querySelector('select[name="fried_foods_highest"]').value = savedData.fried_foods_highest || '';
        document.querySelector('select[name="fried_foods_second"]').value = savedData.fried_foods_second || '';

        // Regenerate rows with saved data
        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        mealTimes.forEach(mealTime => {
            if (savedData.items1 && savedData.items1[mealTime]) {
                document.getElementById(`numItems1_${mealTime}`).value = savedData.items1[mealTime].length || 1;
                generateRows(mealTime, 1);
                const dateInput = document.querySelector(`input[name="recallDate1_${mealTime}"]`);
                if (dateInput && savedData.recall1 && savedData.recall1[0]) {
                    dateInput.value = savedData.recall1[0];
                }
                savedData.items1[mealTime].forEach((item, index) => {
                    if (document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`input[name="item1_${mealTime}[]"]`)[index].value = item || '';
                    }
                });
                savedData.quantities1[mealTime].forEach((qty, index) => {
                    if (document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`input[name="quantity1_${mealTime}[]"]`)[index].value = qty || '';
                    }
                });
                savedData.units1[mealTime].forEach((unit, index) => {
                    if (document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)[index]) {
                        document.querySelectorAll(`select[name="unit1_${mealTime}[]"]`)[index].value = unit || 'cups';
                    }
                });
            }
        });
    }
}