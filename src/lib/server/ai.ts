import { generateObject } from 'ai';
import { z } from 'zod';
import { openrouter } from './openrouter';

const mealAnalysisSchema = z.object({
	isFood: z.boolean().describe('Whether the image contains food or a meal'),
	rejectionReason: z
		.string()
		.optional()
		.describe(
			'If not food, explain why (e.g., "This appears to be a pet", "This is a landscape photo")'
		),
	name: z
		.string()
		.describe(
			'A concise, descriptive name for the meal (e.g., "Grilled Chicken Salad", "Pepperoni Pizza Slice")'
		),
	calories: z.number().int().describe('Estimated total calories'),
	protein: z.number().int().describe('Estimated protein in grams'),
	carbs: z.number().int().describe('Estimated carbohydrates in grams'),
	fat: z.number().int().describe('Estimated fat in grams'),
	sodium: z.number().int().describe('Estimated sodium in milligrams'),
	cholesterol: z.number().int().describe('Estimated cholesterol in milligrams'),
	fiber: z.number().int().describe('Estimated fiber in grams'),
	sugar: z.number().int().describe('Estimated sugar in grams')
});

export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;

const SYSTEM_PROMPT = `You are a nutrition analysis expert. Your job is to analyze photos of food and provide accurate nutritional estimates.

IMPORTANT RULES:
1. ONLY analyze images that clearly contain food or beverages.
2. If the image does NOT contain food (e.g., pets, people, landscapes, objects, screenshots), set isFood to false and provide a brief rejectionReason.
3. When analyzing food, estimate portion sizes carefully based on visual cues (plate size, utensils, hands for scale).
4. Be realistic with calorie estimates - don't underestimate. Most restaurant meals are 600-1200 calories.
5. For homemade meals, consider typical ingredient amounts.
6. If multiple items are visible, sum up the total nutritional content.
7. Round all numbers to reasonable values (calories to nearest 10, macros to nearest gram).

ESTIMATION GUIDELINES:
- A typical dinner plate is ~10-11 inches
- A fist-sized portion of meat is ~3-4 oz
- A cup of rice/pasta is about the size of a tennis ball
- Salad dressings add 100-200 calories per serving
- Cooking oils add ~120 calories per tablespoon
- Cheese adds ~100 calories per oz`;

const USER_PROMPT = `Analyze this food image and provide detailed nutritional information.

If this is NOT a photo of food or a meal, set isFood to false and explain why in rejectionReason.

If this IS food, provide your best estimates for:
- A descriptive name for the meal
- Total calories
- Protein (grams)
- Carbohydrates (grams)
- Fat (grams)
- Sodium (milligrams)
- Cholesterol (milligrams)
- Fiber (grams)
- Sugar (grams)

Be accurate but realistic. Most people underestimate calories, so err on the side of slightly higher estimates when uncertain.`;

export async function analyzeMealFromImage(
	base64Data: string,
	mimeType: string
): Promise<MealAnalysis> {
	const { object } = await generateObject({
		model: openrouter.chat('google/gemini-2.5-flash-preview-09-2025'),
		schema: mealAnalysisSchema,
		messages: [
			{
				role: 'system',
				content: SYSTEM_PROMPT
			},
			{
				role: 'user',
				content: [
					{ type: 'text', text: USER_PROMPT },
					{ type: 'image', image: base64Data, mediaType: mimeType }
				]
			}
		]
	});

	if (!object.isFood) {
		return {
			isFood: false,
			rejectionReason: object.rejectionReason || 'This does not appear to be food.',
			name: '',
			calories: 0,
			protein: 0,
			carbs: 0,
			fat: 0,
			sodium: 0,
			cholesterol: 0,
			fiber: 0,
			sugar: 0
		};
	}

	return object;
}

const calorieOptimizationSchema = z.object({
	calories: z.number().int().describe('Recommended daily calorie intake'),
	timeline: z.string().describe('Estimated time to reach goal (e.g., "8-10 weeks", "3-4 months")'),
	explanation: z
		.string()
		.describe('Brief, friendly explanation of the recommendation (2-3 sentences max)')
});

export type CalorieOptimization = z.infer<typeof calorieOptimizationSchema>;

const CALORIE_SYSTEM_PROMPT = `You are a nutrition and weight loss expert. Calculate safe, sustainable calorie targets for weight loss.

KEY PRINCIPLES:
1. Safe weight loss is 0.5-2 lbs per week (0.25-1 kg per week)
2. Never recommend below 1200 calories for women or 1500 for men
3. A 500 calorie daily deficit = ~1 lb lost per week
4. A 1000 calorie daily deficit = ~2 lbs lost per week (maximum recommended)
5. Be encouraging but realistic about timelines
6. Round calories to nearest 50 for simplicity

ESTIMATION METHOD:
1. Estimate BMR using Mifflin-St Jeor (assume average height, moderate activity)
2. For lbs: assume sedentary TDEE multiplier of 1.4
3. Calculate deficit needed for ~1 lb/week loss (moderate, sustainable pace)
4. Ensure final number is at least 1400 calories`;

export async function optimizeCaloriesWithAI(
	currentWeight: number,
	goalWeight: number,
	unit: string
): Promise<CalorieOptimization> {
	const weightDiff = currentWeight - goalWeight;
	const isLosing = weightDiff > 0;

	const prompt = `Current weight: ${currentWeight} ${unit}
Goal weight: ${goalWeight} ${unit}
Weight to ${isLosing ? 'lose' : 'gain'}: ${Math.abs(weightDiff).toFixed(1)} ${unit}

Calculate the optimal daily calorie target for ${isLosing ? 'safe, sustainable weight loss' : 'healthy weight gain'}.
Provide a realistic timeline and brief explanation.`;

	const { object } = await generateObject({
		model: openrouter.chat('google/gemini-2.5-flash-preview-09-2025'),
		schema: calorieOptimizationSchema,
		messages: [
			{ role: 'system', content: CALORIE_SYSTEM_PROMPT },
			{ role: 'user', content: prompt }
		]
	});

	return object;
}
