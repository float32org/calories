type RecipeData = {
	name: string;
	description?: string | null;
	servings: number;
	prepTime?: number | null;
	cookTime?: number | null;
	ingredients: Array<{ item: string; amount: string; notes?: string }>;
	instructions: string[];
	calories: number | null;
	protein: number | null;
	carbs: number | null;
	fat: number | null;
	tips?: string | null;
};

export function downloadRecipeAsMarkdown(recipe: RecipeData) {
	const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
	const timeInfo = [];
	if (recipe.prepTime) timeInfo.push(`Prep: ${recipe.prepTime} min`);
	if (recipe.cookTime) timeInfo.push(`Cook: ${recipe.cookTime} min`);
	if (totalTime > 0) timeInfo.push(`Total: ${totalTime} min`);

	let md = `# ${recipe.name}\n\n`;
	if (recipe.description) md += `${recipe.description}\n\n`;
	md += `**Servings:** ${recipe.servings}`;
	if (timeInfo.length > 0) md += ` | ${timeInfo.join(' | ')}`;
	md += `\n\n**Nutrition:** ${recipe.calories} cal | ${recipe.protein}g protein | ${recipe.carbs}g carbs | ${recipe.fat}g fat\n\n`;
	md += `## Ingredients\n\n`;
	for (const ing of recipe.ingredients) {
		md += `- ${ing.amount} ${ing.item}${ing.notes ? ` (${ing.notes})` : ''}\n`;
	}
	md += `\n## Instructions\n\n`;
	recipe.instructions.forEach((step, i) => (md += `${i + 1}. ${step}\n`));
	if (recipe.tips) md += `\n## Tips\n\n${recipe.tips}\n`;

	const blob = new Blob([md], { type: 'text/markdown' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}.md`;
	a.click();
	URL.revokeObjectURL(a.href);
}
