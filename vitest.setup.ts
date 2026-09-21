// La fondation du kit est chargée une fois pour toute la suite : sans elle les
// variables de jeton ne sont pas définies, et toute assertion sur une valeur
// résolue mesurerait une chaîne vide.
import './packages/ui-kit-react/src/styles/index.scss';
