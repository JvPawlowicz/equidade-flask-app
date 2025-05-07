import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const TERM_CONTENT = `Grupo Equidade - Plataforma Equidade+

Conforme a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD), este termo tem como objetivo registrar a manifestação livre, informada e inequívoca pela qual o colaborador ou prestador de serviços autoriza o tratamento de seus dados pessoais e dos dados sensíveis dos pacientes acessados por meio da plataforma Equidade+.

1. Finalidade do tratamento de dados

Os dados pessoais e sensíveis tratados por esta plataforma destinam-se exclusivamente à prestação de serviços de saúde a pessoas com deficiência, incluindo:

Registro de evolução clínica
Agendamentos e prontuários
Comunicação entre equipe interdisciplinar
Gestão administrativa e técnica da clínica
2. Tipos de dados tratados

O sistema poderá tratar dados como:

Dados pessoais de pacientes e responsáveis (nome, endereço, telefone, documentos)
Dados sensíveis de saúde (prontuários, diagnósticos, laudos, evoluções)
Dados dos profissionais (identificação, login, IP, horário de acesso)
3. Compartilhamento de dados

O acesso aos dados será concedido apenas a profissionais autorizados da clínica, observando os princípios da necessidade e da segurança da informação.

Não haverá compartilhamento com terceiros, salvo por obrigação legal ou ordem judicial.

4. Segurança

O Grupo Equidade adota medidas técnicas e administrativas para proteger os dados contra acessos não autorizados, perdas ou vazamentos.

5. Direitos do titular

Você pode, a qualquer momento, solicitar:

Confirmação da existência de tratamento
Acesso aos dados
Correção de dados incompletos, inexatos ou desatualizados
Revogação deste consentimento
6. Declaração de aceite

Declaro que li e compreendi este Termo de Consentimento, e que autorizo o tratamento de dados pessoais e sensíveis conforme descrito acima, estando ciente da minha responsabilidade quanto ao uso ético e legal das informações acessadas na plataforma.`;

interface LgpdTermProps {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
}

export function LgpdTermConsent({ open, onAccept, onClose }: LgpdTermProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Detecta quando o usuário rola até o final do documento
  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // margem de erro de 10px
      
      if (isAtBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };
  
  // Reset de estado quando o modal é aberto
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
      setAccepted(false);
      setIsProcessing(false);
    }
  }, [open]);
  
  const handleAcceptClick = () => {
    if (hasScrolledToBottom && accepted) {
      setIsProcessing(true);
      
      try {
        onAccept();
      } catch (error) {
        console.error('Erro ao aceitar termo LGPD:', error);
        // Mesmo em caso de erro, fechamos o modal
        onClose();
      }
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-center">Termo de Consentimento LGPD</DialogTitle>
        </DialogHeader>
        
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="h-[400px] overflow-y-auto p-4 border rounded-md my-4 text-sm"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {TERM_CONTENT}
        </div>
        
        {!hasScrolledToBottom && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-700">
              Por favor, leia todo o documento rolando até o final para poder aceitá-lo.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox 
            id="accept-lgpd" 
            checked={accepted} 
            onCheckedChange={(checked) => setAccepted(!!checked)}
            disabled={!hasScrolledToBottom}
          />
          <Label 
            htmlFor="accept-lgpd" 
            className={!hasScrolledToBottom ? "text-gray-400" : ""}
          >
            Li e aceito os termos acima.
          </Label>
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Sair
          </Button>
          <Button 
            onClick={handleAcceptClick} 
            disabled={!hasScrolledToBottom || !accepted || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Aceitar e Continuar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}