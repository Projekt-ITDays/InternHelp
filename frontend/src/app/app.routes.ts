import { Routes } from '@angular/router';
import { WelcomeScreen } from './pages/welcome-screen/welcome-screen';
import { PromptComponent } from './pages/prompt/prompt-component';
import { Dashboard } from './pages/dashboard/dashboard';
import { RoadmapComponent } from './pages/roadmap/roadmap-component';
import { authGuard } from './core/guards/auth.guard';
import { Survey } from './pages/survey/survey';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/welcome-screen/welcome-screen').then(m => m.WelcomeScreen),
		pathMatch: 'full',
	},
	{
		path: 'survey',
		loadComponent : () => import('./survey/survey').then(m => m.Survey),
		canActivate: []
	},
	{
		// Zmiana aiapi -> ai/ask
		path: 'ai/ask',
		loadComponent : () => import('./prompt-component/prompt-component').then(m => m.PromptComponent),
		canActivate: []

	},
	{
		path: 'ai/roadmap/:careerPath',
		loadComponent : () => import('./roadmap-component/roadmap-component').then(m => m.RoadmapComponent),
		canActivate: []
	},
	{
		path: 'dashboard',
		loadComponent : () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
		canActivate: []
	},
	{
		path: 'Settings',
		loadComponent :	() => import('./pages/settings/settings').then(m => m.Settings),
		canActivate: []
	},
	{
		path: '**',
		redirectTo: '',
	}
];
