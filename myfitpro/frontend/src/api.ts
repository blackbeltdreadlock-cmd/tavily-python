export type User={id:number;name:string;email:string;role:'academy'|'trainer'|'student';created_at:string}
export type Student={id:number;trainer_id:number;name:string;email:string;goal:string;active:boolean;birth_date?:string|null;weight?:number|null;height?:number|null;created_at:string}
export type Workout={id:number;trainer_id:number;student_id?:number|null;title:string;objective:string;duration:number;exercises:number;status:string;created_at:string}
export type Assessment={id:number;trainer_id:number;student_id:number;date:string;weight:number;body_fat:number;muscle_mass:number;status:string;progress:number}
export type ScheduleItem={id:number;trainer_id:number;student_id:number;date:string;time:string;workout_type:string;status:string}
const API_URL=import.meta.env.VITE_API_URL??'http://localhost:8000'
async function request<T>(path:string,options:RequestInit={},token?:string):Promise<T>{const headers=new Headers(options.headers);if(options.body)headers.set('Content-Type','application/json');if(token)headers.set('Authorization',`Bearer ${token}`);const response=await fetch(`${API_URL}${path}`,{...options,headers});const body=await response.text();if(!response.ok){let message='Erro na API';try{message=JSON.parse(body).detail??message}catch{}throw new Error(message)}return body?JSON.parse(body) as T:undefined as T}
export async function login(email:string,password:string){const response=await fetch(`${API_URL}/api/v1/auth/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:email,password})});if(!response.ok)throw new Error('E-mail ou senha incorretos');return response.json() as Promise<{access_token:string;token_type:string}>}
export const getMe=(token:string)=>request<User>('/api/v1/me',{},token)
export const getStudents=(token:string)=>request<Student[]>('/api/v1/students',{},token)
export const createStudent=(token:string,data:Pick<Student,'name'|'email'|'goal'>)=>request<Student>('/api/v1/students',{method:'POST',body:JSON.stringify(data)},token)
export const getWorkouts=(token:string)=>request<Workout[]>('/api/v1/workouts',{},token)
export const createWorkout=(token:string,data:Pick<Workout,'title'|'objective'|'duration'|'exercises'>)=>request<Workout>('/api/v1/workouts',{method:'POST',body:JSON.stringify(data)},token)
export const getAssessments=(token:string)=>request<Assessment[]>('/api/v1/assessments',{},token)
export const getSchedule=(token:string)=>request<ScheduleItem[]>('/api/v1/schedule',{},token)
