const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(express.json());

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://127.0.0.1:5501'], // Allow both ports
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'survey_data',
    password: 'Sripost@123',
    port: 5432,
});

async function initializeDatabase() {
    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                name TEXT,
                age INTEGER,
                gender TEXT,
                education TEXT,
                occupation TEXT,
                income_level TEXT,
                weight REAL,
                height REAL,
                bmi REAL,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS dietary_preferences (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                myplate TEXT,
                foodpyramid TEXT,
                dietaryguidelines TEXT,
                learn_source TEXT,
                myplate_includes TEXT,
                balancedmeals TEXT,
                foodgroups TEXT,
                foodgroups_list TEXT,
                servings TEXT,
                foodpyramid_base TEXT,
                preference_reason TEXT,
                barrier TEXT,
                practical TEXT,
                diet_type TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS physical_activity (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                aware_physical TEXT,
                engage_daily TEXT,
                activity_type TEXT,
                duration TEXT,
                frequency TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS food_frequency (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                food_group TEXT,
                frequency TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_food_freq UNIQUE (submission_id, food_group)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS top_two_items (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                food_group TEXT,
                highest_item TEXT,
                second_item TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_top_two UNIQUE (submission_id, food_group)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS meal_items (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
                meal_type TEXT,
                date DATE,
                item TEXT,
                quantity REAL,
                unit TEXT,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Connected to PostgreSQL and tables verified');
        client.release();
    } catch (err) {
        console.error('Error initializing database:', err.message);
        process.exit(1);
    }
}

initializeDatabase();

app.options('/api/submit', cors());
app.options('/api/data', cors());

app.post('/api/submit', async (req, res) => {
    const { data: formData } = req.body; // Expect nested structure under 'data'
    if (!formData) {
        console.error('No formData received');
        return res.status(400).json({ message: 'No data provided' });
    }
    console.log('Received data:', JSON.stringify(formData, null, 2));

    const weight = parseFloat(formData.submissions.weight) || 0;
    const heightCm = parseFloat(formData.submissions.height) || 0;
    const bmi = heightCm > 0 ? weight / ((heightCm / 100) * (heightCm / 100)) : 0;
    const age = formData.submissions.age !== '' ? parseInt(formData.submissions.age) || null : null;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Insert into submissions (Section 1 + 2)
        const submissionResult = await client.query(
            'INSERT INTO submissions (name, age, gender, education, occupation, income_level, weight, height, bmi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
            [formData.submissions.name || '', age, formData.submissions.gender || '', formData.submissions.education || '', formData.submissions.occupation || '', formData.submissions.income_level || '', weight, heightCm, bmi.toFixed(2)]
        );
        const submissionId = submissionResult.rows[0].id;
        console.log(`Inserted submission with ID: ${submissionId}`);

        // Insert into dietary_preferences (Section 3A)
        const learnSource = (formData.dietary_preferences.myplate === 'yes' || formData.dietary_preferences.foodpyramid === 'yes' || formData.dietary_preferences.dietaryguidelines === 'yes') ? formData.dietary_preferences.learn_source || '' : '';
        await client.query(
            'INSERT INTO dietary_preferences (submission_id, myplate, foodpyramid, dietaryguidelines, learn_source, myplate_includes, balancedmeals, foodgroups, foodgroups_list, servings, foodpyramid_base, preference_reason, barrier, practical, diet_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
            [submissionId, formData.dietary_preferences.myplate || 'no', formData.dietary_preferences.foodpyramid || 'no', formData.dietary_preferences.dietaryguidelines || 'no', learnSource, formData.dietary_preferences.myplate_includes || '', formData.dietary_preferences.balancedmeals || 'no', formData.dietary_preferences.foodgroups || 'no', formData.dietary_preferences.foodgroups_list || '', formData.dietary_preferences.servings || 'no', formData.dietary_preferences.foodpyramid_base || '', formData.dietary_preferences.preference_reason || '', formData.dietary_preferences.barrier || '', formData.dietary_preferences.practical || '', formData.dietary_preferences.diet_type || '']
        );
        console.log('Inserted dietary_preferences');

        // Insert into physical_activity (Section 3B)
        const engageDaily = formData.physical_activity.engage_daily || 'no';
        const activityData = {
            submission_id: submissionId,
            aware_physical: formData.physical_activity.aware_physical || 'no',
            engage_daily: engageDaily,
            activity_type: engageDaily === 'yes' ? formData.physical_activity.activity_type || '' : '',
            duration: engageDaily === 'yes' ? formData.physical_activity.duration || '' : '',
            frequency: engageDaily === 'yes' && formData.physical_activity.frequency !== '' ? formData.physical_activity.frequency : null
        };
        await client.query(
            'INSERT INTO physical_activity (submission_id, aware_physical, engage_daily, activity_type, duration, frequency) VALUES ($1, $2, $3, $4, $5, $6)',
            [activityData.submission_id, activityData.aware_physical, activityData.engage_daily, activityData.activity_type, activityData.duration, activityData.frequency]
        );
        console.log('Inserted physical_activity');

        // Insert into food_frequency (Section 5)
        const foodGroups = {
            cereal_milled: formData.food_frequency.cereal_milled,
            cereal_whole: formData.food_frequency.cereal_whole,
            pulses: formData.food_frequency.pulses,
            green_leafy: formData.food_frequency.green_leafy,
            other_veg: formData.food_frequency.other_veg,
            roots_tubers: formData.food_frequency.roots_tubers,
            fruits: formData.food_frequency.fruits,
            nuts_seeds: formData.food_frequency.nuts_seeds,
            milk_products: formData.food_frequency.milk_products,
            meat_products: formData.food_frequency.meat_products,
            sugary_bev: formData.food_frequency.sugary_bev,
            confectionery: formData.food_frequency.confectionery,
            fried_foods: formData.food_frequency.fried_foods,
            packaged_snacks: formData.food_frequency.packaged_snacks,
            pizzas_burgers: formData.food_frequency.pizzas_burgers,
            sugars: formData.food_frequency.sugars
        };
        for (const [group, frequency] of Object.entries(foodGroups)) {
            if (frequency) {
                await client.query(
                    'INSERT INTO food_frequency (submission_id, food_group, frequency) VALUES ($1, $2, $3)',
                    [submissionId, group, frequency]
                );
            }
        }
        console.log('Inserted food_frequency');

        // Insert into top_two_items (Section 6)
        const foodGroupsTopTwo = {
            cereal_milled: { highest: formData.top_two_items.cereal_milled_highest, second: formData.top_two_items.cereal_milled_second },
            cereal_whole: { highest: formData.top_two_items.cereal_whole_highest, second: formData.top_two_items.cereal_whole_second },
            pulses: { highest: formData.top_two_items.pulses_highest, second: formData.top_two_items.pulses_second },
            green_leafy: { highest: formData.top_two_items.green_leafy_highest, second: formData.top_two_items.green_leafy_second },
            other_veg: { highest: formData.top_two_items.other_veg_highest, second: formData.top_two_items.other_veg_second },
            roots_tubers: { highest: formData.top_two_items.roots_tubers_highest, second: formData.top_two_items.roots_tubers_second },
            fruits: { highest: formData.top_two_items.fruits_highest, second: formData.top_two_items.fruits_second },
            nuts_seeds: { highest: formData.top_two_items.nuts_seeds_highest, second: formData.top_two_items.nuts_seeds_second },
            milk_products: { highest: formData.top_two_items.milk_products_highest, second: formData.top_two_items.milk_products_second },
            meat_products: { highest: formData.top_two_items.meat_products_highest, second: formData.top_two_items.meat_products_second },
            sugary_bev: { highest: formData.top_two_items.sugary_bev_highest, second: formData.top_two_items.sugary_bev_second },
            confectionery: { highest: formData.top_two_items.confectionery_highest, second: formData.top_two_items.confectionery_second },
            fried_foods: { highest: formData.top_two_items.fried_foods_highest, second: formData.top_two_items.fried_foods_second }
        };
        for (const [group, { highest, second }] of Object.entries(foodGroupsTopTwo)) {
            if (highest || second) {
                await client.query(
                    'INSERT INTO top_two_items (submission_id, food_group, highest_item, second_item) VALUES ($1, $2, $3, $4)',
                    [submissionId, group, highest || '', second || '']
                );
            }
        }
        console.log('Inserted top_two_items');

        // Insert into meal_items (Section 7 for Day 1 only)
        const mealTimes = ['Early', 'Breakfast', 'Mid-morning', 'Lunch', 'Teatime', 'Dinner', 'Bedtime'];
        let insertedMealItems = 0;
        for (const [index, mealTime] of mealTimes.entries()) {
            const recallDate = formData.meal_items.recall1[index] || null;
            const items = formData.meal_items.items1[mealTime] || [];
            const quantities = formData.meal_items.quantities1[mealTime] || [];
            const units = formData.meal_items.units1[mealTime] || [];
            console.log(`Processing meal_time=${mealTime}, recall_date=${recallDate}, items=${JSON.stringify(items)}, quantities=${JSON.stringify(quantities)}, units=${JSON.stringify(units)}`);

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item && item.trim() && recallDate) { // Only include if item is non-empty and date is valid
                    const quantity = quantities[i] !== undefined && quantities[i] !== '' ? parseFloat(quantities[i]) : null;
                    const unit = units[i] || null;
                    console.log(`Attempting to insert meal item: submission_id=${submissionId}, meal_type=${mealTime}, date=${recallDate}, item=${item}, quantity=${quantity}, unit=${unit}`);

                    try {
                        const result = await client.query(
                            'INSERT INTO meal_items (submission_id, meal_type, date, item, quantity, unit) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                            [submissionId, mealTime, recallDate, item, quantity, unit]
                        );
                        console.log(`Successfully inserted meal item with ID: ${result.rows[0].id}`);
                        insertedMealItems++;
                    } catch (insertErr) {
                        console.error(`Failed to insert meal item for meal_type=${mealTime}, item=${item}:`, insertErr.message);
                        throw insertErr; // Re-throw to trigger rollback
                    }
                } else {
                    console.log(`Skipping meal item: meal_time=${mealTime}, item=${item}, recall_date=${recallDate}`);
                }
            }
        }
        console.log(`Total meal items inserted: ${insertedMealItems}`);

        await client.query('COMMIT');
        console.log('Data saved with ID:', submissionId);
        res.json({ message: 'Data saved successfully' });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('Error saving to PostgreSQL:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to save data to database', error: err.message });
    } finally {
        if (client) client.release();
    }
});

app.get('/api/data', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, dp.*, pa.*, ff.*, tti.*, mi.*
            FROM submissions s
            LEFT JOIN dietary_preferences dp ON s.id = dp.submission_id
            LEFT JOIN physical_activity pa ON s.id = pa.submission_id
            LEFT JOIN food_frequency ff ON s.id = ff.submission_id
            LEFT JOIN top_two_items tti ON s.id = tti.submission_id
            LEFT JOIN meal_items mi ON s.id = mi.submission_id
        `);
        console.log('Fetched data:', result.rows);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data from PostgreSQL:', err.message);
        res.status(500).json({ message: 'Failed to fetch data', error: err.message });
    }
});

// Start the server
const port = 5000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});