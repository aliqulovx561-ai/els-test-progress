const UNITS_BASE_URL = './units/';
const UNITS_INDEX_URL = './units/units-index.json';

// Cache loaded units
const unitCache = new Map();
let unitsIndex = null;

export async function getAvailableUnits() {
    try {
        if (unitsIndex) return unitsIndex.availableUnits;
        
        const response = await fetch(UNITS_INDEX_URL);
        const data = await response.json();
        unitsIndex = data;
        return data.availableUnits;
    } catch (error) {
        console.error('Error loading units index:', error);
        return [];
    }
}

export async function loadUnit(unitId) {
    // Check cache first
    if (unitCache.has(unitId)) {
        return unitCache.get(unitId);
    }
    
    try {
        const units = await getAvailableUnits();
        const unitInfo = units.find(u => u.id === unitId);
        
        if (!unitInfo || unitInfo.status !== 'available') {
            throw new Error(`Unit ${unitId} is not available`);
        }
        
        const response = await fetch(`${UNITS_BASE_URL}${unitInfo.file}`);
        if (!response.ok) {
            throw new Error(`Failed to load unit ${unitId}`);
        }
        
        const unitData = await response.json();
        
        // Add grammar info from index
        if (unitInfo.grammarStructure && unitInfo.grammarExamples) {
            unitData.grammarStructure = unitInfo.grammarStructure;
            unitData.grammarExamples = unitInfo.grammarExamples;
        }
        
        unitCache.set(unitId, unitData);
        return unitData;
    } catch (error) {
        console.error(`Error loading unit ${unitId}:`, error);
        return null;
    }
}

export async function getUnitGrammarInfo(unitId) {
    const units = await getAvailableUnits();
    const unitInfo = units.find(u => u.id === unitId);
    
    if (!unitInfo) return null;
    
    return {
        structure: unitInfo.grammarStructure,
        examples: unitInfo.grammarExamples || []
    };
}

export async function loadMultipleUnits(unitIds) {
    const promises = unitIds.map(id => loadUnit(id));
    const results = await Promise.allSettled(promises);
    return results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);
}
