function calculateBMI() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value) / 100; // Convert cm to m
    if (weight && height) {
        const bmi = weight / (height * height);
        document.getElementById('bmi').value = bmi.toFixed(2);
    } else {
        alert("Please enter weight and height!");
    }
}

function addRow(mealTime) {
    console.log("Attempting to add row for:", mealTime); // Debug log
    const tbody = document.querySelector('#mealRecallTable tbody');
    const rows = Array.from(tbody.getElementsByTagName('tr'));
    let insertAfter = null;

    // Debug: Log all row contents
    rows.forEach((row, index) => {
        console.log(`Row ${index} textContent: "${row.cells[0].textContent.trim()}"`);
    });

    // Find the last row for this meal time
    for (let row of rows) {
        const rowText = row.cells[0].textContent.trim().toLowerCase();
        const targetText = mealTime.toLowerCase();
        console.log(`Comparing "${rowText}" with "${targetText}"`);
        if (rowText === targetText) {
            insertAfter = row;
            console.log(`Found match for ${mealTime} at row`);
        }
    }

    if (!insertAfter) {
        console.error(`No base row found for meal time: ${mealTime}`);
        return;
    }

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td></td>
        <td><input type="date" name="recallDate_${mealTime}"></td>
        <td><input type="text" name="item_${mealTime}[]"></td>
        <td><input type="number" name="quantity_${mealTime}[]" step="0.1"></td>
        <td><select name="unit_${mealTime}[]"><option value="cups">Cups</option><option value="tablespoons">Tablespoons</option><option value="teaspoons">Teaspoons</option><option value="pieces">Pieces</option></select></td>
        <td><button type="button" onclick="deleteRow(this)">Delete</button></td>
    `;
    tbody.insertBefore(newRow, insertAfter.nextSibling);
    console.log(`Added new row for ${mealTime}`);
}

function deleteRow(button) {
    button.closest('tr').remove();
}

function saveData() {
    const data = {
        name: document.getElementById('name').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        education: document.getElementById('education').value,
        occupation: document.getElementById('occupation').value,
        income: document.getElementById('income').value,
        weight: document.getElementById('weight').value,
        height: document.getElementById('height').value,
        bmi: document.getElementById('bmi').value,
        dietary_assessment: {
            heard_food_groups: document.querySelector('input[name="heard_food_groups"]:checked')?.value || '',
            food_groups_list: document.getElementById('food_groups_list').value,
            heard_balanced: document.querySelector('input[name="heard_balanced"]:checked')?.value || '',
            aware_balanced: document.querySelector('input[name="aware_balanced"]:checked')?.value || '',
            sources: Array.from(document.querySelectorAll('input[name="sources"]:checked')).map(cb => cb.value)
        },
        physical_activity: {
            barriers: Array.from(document.querySelectorAll('input[name="barriers"]:checked')).map(cb => cb.value),
            aware_physical: document.querySelector('input[name="aware_physical"]:checked')?.value || '',
            engage_daily: document.querySelector('input[name="engage_daily"]:checked')?.value || '',
            activity_type: Array.from(document.querySelectorAll('input[name="activity_type"]:checked')).map(cb => cb.value),
            duration: document.querySelector('input[name="duration"]:checked')?.value || '',
            frequency: document.querySelector('input[name="frequency"]:checked')?.value || ''
        },
        food_frequency: {},
        circled_foods: {
            cereal_milled: {
                highest: document.querySelector('select[name="cereal_milled_highest"]').value,
                second: document.querySelector('select[name="cereal_milled_second"]').value
            },
            cereal_whole: {
                highest: document.querySelector('select[name="cereal_whole_highest"]').value,
                second: document.querySelector('select[name="cereal_whole_second"]').value
            },
            pulses: {
                highest: document.querySelector('select[name="pulses_highest"]').value,
                second: document.querySelector('select[name="pulses_second"]').value
            },
            green_leafy: {
                highest: document.querySelector('select[name="green_leafy_highest"]').value,
                second: document.querySelector('select[name="green_leafy_second"]').value
            },
            other_veg: {
                highest: document.querySelector('select[name="other_veg_highest"]').value,
                second: document.querySelector('select[name="other_veg_second"]').value
            },
            roots_tubers: {
                highest: document.querySelector('select[name="roots_tubers_highest"]').value,
                second: document.querySelector('select[name="roots_tubers_second"]').value
            },
            fruits: {
                highest: document.querySelector('select[name="fruits_highest"]').value,
                second: document.querySelector('select[name="fruits_second"]').value
            },
            nuts_seeds: {
                highest: document.querySelector('select[name="nuts_seeds_highest"]').value,
                second: document.querySelector('select[name="nuts_seeds_second"]').value
            },
            milk_products: {
                highest: document.querySelector('select[name="milk_products_highest"]').value,
                second: document.querySelector('select[name="milk_products_second"]').value
            },
            meat_products: {
                highest: document.querySelector('select[name="meat_products_highest"]').value,
                second: document.querySelector('select[name="meat_products_second"]').value
            },
            sugary_bev: {
                highest: document.querySelector('select[name="sugary_bev_highest"]').value,
                second: document.querySelector('select[name="sugary_bev_second"]').value
            },
            confectionery: {
                highest: document.querySelector('select[name="confectionery_highest"]').value,
                second: document.querySelector('select[name="confectionery_second"]').value
            },
            high_fat_foods: {
                highest: document.querySelector('select[name="high_fat_foods_highest"]').value,
                second: document.querySelector('select[name="high_fat_foods_second"]').value
            }
        }
    };
    // Collect food frequency data
    document.querySelectorAll('table:nth-of-type(1) input[type="checkbox"]:checked').forEach(cb => {
        const row = cb.closest('tr');
        const foodGroup = row.cells[0].textContent;
        if (!data.food_frequency[foodGroup]) data.food_frequency[foodGroup] = [];
        data.food_frequency[foodGroup].push(cb.parentElement.cellIndex - 1); // Frequency index
    });
    // Collect meal recall data
    data.mealRecall = {};
    const mealTimes = ['Early', 'Breakfast', 'MidMorning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
    mealTimes.forEach(meal => {
        const items = [];
        const date = document.querySelector(`input[name="recallDate_${meal}"]`)?.value;
        document.querySelectorAll(`input[name="item_${meal}[]"]`).forEach((itemInput, index) => {
            const item = itemInput.value;
            const quantity = document.querySelectorAll(`input[name="quantity_${meal}[]"]`)[index]?.value;
            const unit = document.querySelectorAll(`select[name="unit_${meal}[]"]`)[index]?.value;
            if (item && quantity && unit) {
                items.push({ item, quantity, unit });
            }
        });
        if (items.length > 0) {
            data.mealRecall[meal] = { date, items };
        }
    });
    console.log("Saved Data:", data);
    alert("Data saved to console!");
}

// Show activity type options if "Yes" to daily engagement
document.querySelectorAll('input[name="engage_daily"]').forEach(radio => {
    radio.addEventListener('change', () => {
        document.getElementById('activity_type_group').style.display = radio.value === 'yes' ? 'block' : 'none';
    });
});