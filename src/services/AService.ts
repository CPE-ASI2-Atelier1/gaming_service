export default abstract class AService {
    /**
     * Vérifie si un ID est un nombre valide (par exemple, un entier positif).
     * @param id - L'ID à vérifier.
     * @returns `true` si l'ID est valide, sinon `false`.
     */
    protected isValidNumber(id: any): boolean {
        if (typeof id === 'number' && Number.isInteger(id) && id > 0) {
            return true; // C'est déjà un nombre valide
        }
        if (typeof id === 'string' && /^\d+$/.test(id)) {
            return true; // C'est une chaîne contenant uniquement des chiffres
        }
        return false; // Ni un entier positif ni une chaîne valide
    }
}